import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseUserService } from '../common/services/base-user-service';
import { CatalogQueryDto, CreateCatalogItemDto, UpdateCatalogItemDto } from './catalog.dto';
import { lockCatalogItem } from './catalog-references';

@Injectable()
export class CatalogService extends BaseUserService {
  async findAll(userId: string, query: CatalogQueryDto) {
    const { search, type, status = 'active', page, limit } = query;
    const where: Prisma.CatalogItemWhereInput = {
      userId,
      ...(type && { type }),
      ...(status !== 'all' && { isArchived: status === 'archived' }),
      ...(search?.trim() && {
        OR: ['name', 'description', 'sku'].map((field) => ({
          [field]: { contains: search.trim(), mode: 'insensitive' },
        })),
      }),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.catalogItem.count({ where }),
      this.prisma.catalogItem.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
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

  async findById(userId: string, id: string) {
    const item = await this.prisma.catalogItem.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Catalog item not found or access denied.');
    return item;
  }

  async create(userId: string, dto: CreateCatalogItemDto) {
    await this.validateUserExists(userId);
    try {
      return await this.prisma.catalogItem.create({
        data: {
          userId,
          type: dto.type,
          name: dto.name,
          description: dto.description ?? '',
          sku: dto.sku ?? null,
          unit: dto.unit,
          rate: dto.rate,
          currency: dto.currency,
        },
      });
    } catch (error) {
      return this.rethrow(error);
    }
  }

  async update(userId: string, id: string, dto: UpdateCatalogItemDto) {
    if (!Object.keys(dto).length)
      throw new BadRequestException('Provide at least one field to update.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await lockCatalogItem(tx, userId, id);
        if (
          existing.usedAt &&
          ((dto.type !== undefined && dto.type !== existing.type) ||
            (dto.unit !== undefined && dto.unit !== existing.unit))
        ) {
          throw new BadRequestException(
            'Type and unit cannot change after an item has been used. Archive it and create another item.',
          );
        }
        return tx.catalogItem.update({ where: { id }, data: dto });
      });
    } catch (error) {
      return this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('This SKU is already used in your catalog.');
    }
    throw error;
  }
}
