import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogItem, Prisma, StockActionKind } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { lockCatalogItem } from '../catalog/catalog-references';
import {
  AdjustStockDto,
  InventoryBalanceQueryDto,
  InventoryHistoryQueryDto,
  OpeningStockDto,
  StockRequestDto,
} from './inventory.dto';
import { stockQuantity } from './stock-quantity';
import { assertStockBalances, stockRequestHash } from './stock-ledger';

const productSelect = {
  id: true,
  name: true,
  sku: true,
  unit: true,
  isArchived: true,
  stockTrackingStartedAt: true,
} satisfies Prisma.CatalogItemSelect;
const actionInclude = {
  movements: {
    orderBy: { catalogItemId: 'asc' },
    include: { catalogItem: { select: productSelect } },
  },
  reversal: { select: { id: true } },
} satisfies Prisma.StockActionInclude;
type Action = Prisma.StockActionGetPayload<{ include: typeof actionInclude }>;

function serialize(action: Action) {
  return {
    id: action.id,
    sequence: action.sequence.toString(),
    requestId: action.requestId,
    kind: action.kind,
    invoiceId: action.invoiceId,
    reversalOfId: action.reversalOfId,
    reversedById: action.reversal?.id ?? null,
    reason: action.reason,
    effectiveDate: action.effectiveDate.toISOString().slice(0, 10),
    createdAt: action.createdAt,
    movements: action.movements.map((movement) => ({
      catalogItemId: movement.catalogItemId,
      quantityDelta: movement.quantityDelta.toFixed(3),
      product: movement.catalogItem,
    })),
  };
}

function pagination<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  opening(userId: string, catalogItemId: string, dto: OpeningStockDto) {
    const quantity = stockQuantity(dto.quantity);
    const hash = stockRequestHash({
      operation: 'opening',
      catalogItemId,
      quantity: quantity.toFixed(3),
      unit: dto.unit.trim(),
      reason: dto.reason.trim(),
      effectiveDate: dto.effectiveDate,
    });
    return this.post(userId, catalogItemId, dto.requestId, hash, async (tx, product) => {
      this.requireUnit(product, dto.unit);
      if (product.type !== 'PRODUCT')
        throw new BadRequestException('Only products can track stock.');
      if (product.isArchived)
        throw new ConflictException('Unarchive this product before enabling stock tracking.');
      if (product.stockTrackingStartedAt)
        throw new ConflictException(
          'Stock tracking is already enabled. Record an adjustment to correct stock.',
        );
      await tx.catalogItem.update({
        where: { id: product.id },
        data: { stockTrackingStartedAt: new Date() },
      });
      return this.createAction(tx, userId, catalogItemId, dto, hash, 'OPENING', quantity, {
        sourceKey: `opening:${catalogItemId}`,
      });
    });
  }

  adjust(userId: string, catalogItemId: string, dto: AdjustStockDto) {
    const quantity = stockQuantity(dto.quantity);
    if (quantity.isZero())
      throw new BadRequestException('Adjustment quantity must be greater than zero.');
    const delta = dto.direction === 'OUT' ? quantity.negated() : quantity;
    const hash = stockRequestHash({
      operation: 'adjustment',
      catalogItemId,
      quantity: quantity.toFixed(3),
      unit: dto.unit.trim(),
      direction: dto.direction,
      reason: dto.reason.trim(),
      effectiveDate: dto.effectiveDate,
    });
    return this.post(userId, catalogItemId, dto.requestId, hash, async (tx, product) => {
      this.requireTracking(product);
      this.requireUnit(product, dto.unit);
      await assertStockBalances(tx, userId, [{ catalogItemId, delta }]);
      return this.createAction(tx, userId, catalogItemId, dto, hash, 'ADJUSTMENT', delta);
    });
  }

  async reverse(userId: string, actionId: string, dto: StockRequestDto) {
    // Source actions and movements are immutable; reversal state is checked under the product lock.
    const original = await this.prisma.stockAction.findFirst({
      where: { id: actionId, userId },
      include: actionInclude,
    });
    if (!original) throw new NotFoundException('Stock adjustment not found or access denied.');
    if (
      original.kind !== 'ADJUSTMENT' ||
      original.reversalOfId ||
      original.movements.length !== 1 ||
      !original.catalogItemId
    ) {
      throw new BadRequestException('Only an original manual adjustment can be reversed.');
    }
    const catalogItemId = original.catalogItemId;
    const delta = original.movements[0].quantityDelta.negated();
    const hash = stockRequestHash({
      operation: 'reversal',
      actionId,
      reason: dto.reason.trim(),
      effectiveDate: dto.effectiveDate,
    });
    return this.post(userId, catalogItemId, dto.requestId, hash, async (tx, product) => {
      this.requireTracking(product);
      if (
        await tx.stockAction.findUnique({
          where: { userId_reversalOfId: { userId, reversalOfId: actionId } },
          select: { id: true },
        })
      ) {
        throw new ConflictException('This adjustment has already been reversed.');
      }
      await assertStockBalances(tx, userId, [{ catalogItemId, delta }]);
      return this.createAction(tx, userId, catalogItemId, dto, hash, 'ADJUSTMENT', delta, {
        reversalOfId: actionId,
      });
    });
  }

  private requireTracking(product: CatalogItem) {
    if (product.type !== 'PRODUCT' || !product.stockTrackingStartedAt) {
      throw new ConflictException('Enable stock tracking with a current opening quantity first.');
    }
  }

  private requireUnit(product: CatalogItem, unit: string) {
    if (product.unit !== unit.trim()) {
      throw new ConflictException(
        'The product unit has changed. Refresh the product and enter the quantity in its current unit.',
      );
    }
  }

  private createAction(
    tx: Prisma.TransactionClient,
    userId: string,
    catalogItemId: string,
    dto: StockRequestDto,
    hash: string,
    kind: StockActionKind,
    delta: Prisma.Decimal,
    source: { sourceKey?: string; reversalOfId?: string } = {},
  ) {
    return tx.stockAction.create({
      data: {
        userId,
        catalogItemId,
        requestId: dto.requestId,
        requestHash: hash,
        kind,
        ...source,
        reason: dto.reason.trim(),
        effectiveDate: new Date(`${dto.effectiveDate}T00:00:00.000Z`),
        movements: { create: { catalogItemId, quantityDelta: delta } },
      },
      include: actionInclude,
    });
  }

  private replay(action: Action, hash: string) {
    if (action.requestHash !== hash)
      throw new ConflictException(
        'This request ID was already used with different stock action details. Use a new request ID.',
      );
    return { replayed: true, action: serialize(action) };
  }

  private async post(
    userId: string,
    catalogItemId: string,
    requestId: string,
    hash: string,
    write: (tx: Prisma.TransactionClient, product: CatalogItem) => Promise<Action>,
  ) {
    const where = { userId_requestId: { userId, requestId } };
    const prior = await this.prisma.stockAction.findUnique({ where, include: actionInclude });
    if (prior) return this.replay(prior, hash);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const product = await lockCatalogItem(tx, userId, catalogItemId);
          const existing = await tx.stockAction.findUnique({ where, include: actionInclude });
          if (existing) return this.replay(existing, hash);
          return { replayed: false, action: serialize(await write(tx, product)) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      // The same account request can race on different products. Recover only this unique-key case.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.stockAction.findUnique({
          where,
          include: actionInclude,
        });
        if (existing) return this.replay(existing, hash);
        throw new ConflictException(
          'This stock action conflicts with existing history. Refresh and use a new request ID.',
        );
      }
      throw error;
    }
  }

  async balance(userId: string, catalogItemId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const product = await tx.catalogItem.findFirst({ where: { id: catalogItemId, userId } });
        if (!product) throw new NotFoundException('Catalog item not found or access denied.');
        this.requireTracking(product);
        const totals = await tx.stockMovement.aggregate({
          where: { userId, catalogItemId },
          _sum: { quantityDelta: true },
        });
        return {
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            isArchived: product.isArchived,
            stockTrackingStartedAt: product.stockTrackingStartedAt,
          },
          quantity: (totals._sum.quantityDelta ?? new Prisma.Decimal(0)).toFixed(3),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async balances(userId: string, query: InventoryBalanceQueryDto) {
    const { search, status, page, limit } = query;
    const where: Prisma.CatalogItemWhereInput = {
      userId,
      type: 'PRODUCT',
      stockTrackingStartedAt: { not: null },
      ...(status !== 'all' && { isArchived: status === 'archived' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.catalogItem.count({ where });
        const products = await tx.catalogItem.findMany({
          where,
          select: productSelect,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
        });
        const sums = await tx.stockMovement.groupBy({
          by: ['catalogItemId'],
          where: { userId, catalogItemId: { in: products.map((product) => product.id) } },
          _sum: { quantityDelta: true },
        });
        const balances = new Map(sums.map((sum) => [sum.catalogItemId, sum._sum.quantityDelta]));
        return pagination(
          products.map((product) => ({
            product,
            quantity: (balances.get(product.id) ?? new Prisma.Decimal(0)).toFixed(3),
          })),
          total,
          page,
          limit,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async history(userId: string, query: InventoryHistoryQueryDto) {
    const { catalogItemId, kind, page, limit } = query;
    return this.prisma.$transaction(
      async (tx) => {
        if (
          catalogItemId &&
          !(await tx.catalogItem.findFirst({
            where: { id: catalogItemId, userId },
            select: { id: true },
          }))
        ) {
          throw new NotFoundException('Catalog item not found or access denied.');
        }
        const where: Prisma.StockActionWhereInput = {
          userId,
          ...(kind && { kind }),
          ...(catalogItemId && { movements: { some: { catalogItemId, userId } } }),
        };
        const total = await tx.stockAction.count({ where });
        const actions = await tx.stockAction.findMany({
          where,
          include: actionInclude,
          orderBy: { sequence: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        });
        return pagination(actions.map(serialize), total, page, limit);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
