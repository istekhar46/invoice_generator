import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogItem, LineItemType, Prisma } from '@prisma/client';

export async function lockCatalogItem(tx: Prisma.TransactionClient, userId: string, id: string) {
  // Serialize first use against changes to type/unit/archive. Parameters stay bound.
  const rows = await tx.$queryRaw<CatalogItem[]>`
    SELECT * FROM "catalog_items" WHERE "id" = ${id} AND "userId" = ${userId} FOR UPDATE
  `;
  if (!rows[0]) throw new NotFoundException('Catalog item not found or access denied.');
  return rows[0];
}

interface CatalogReference {
  catalogItemId?: string | null;
  type: LineItemType;
  unit: string;
}

export async function lockCatalogItems(
  tx: Prisma.TransactionClient,
  userId: string,
  ids: string[],
) {
  const products = new Map<string, CatalogItem>();
  for (const id of [...new Set(ids)].sort())
    products.set(id, await lockCatalogItem(tx, userId, id));
  return products;
}

export async function validateCatalogReferences(
  tx: Prisma.TransactionClient,
  userId: string,
  items: CatalogReference[],
  existing: CatalogReference[] = [],
) {
  const ids = [
    ...new Set(
      [...items, ...existing].flatMap((item) => (item.catalogItemId ? [item.catalogItemId] : [])),
    ),
  ].sort();
  const products = await lockCatalogItems(tx, userId, ids);
  for (const [id, catalog] of products) {
    const selected = items.filter((item) => item.catalogItemId === id);
    const retainedCount = existing.filter((item) => item.catalogItemId === id).length;
    if (catalog.isArchived && selected.length > retainedCount) {
      throw new BadRequestException(
        'Archived catalog items cannot be added. Choose an active item.',
      );
    }
    if (selected.some((item) => item.type !== catalog.type || item.unit.trim() !== catalog.unit)) {
      throw new BadRequestException(
        'Catalog item type or unit does not match. Choose the item again or use a one-off item.',
      );
    }
    if (selected.length && !catalog.usedAt)
      await tx.catalogItem.update({ where: { id }, data: { usedAt: new Date() } });
  }
  return products;
}
