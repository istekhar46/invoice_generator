import { Test } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { DashboardModule } from './dashboard.module';
import { DashboardService } from './dashboard.service';

it('uses the shared database client for dashboard queries instead of creating another pool', async () => {
  const created: object[] = [];
  const findUser = jest.fn().mockResolvedValue({ id: 'owner' });
  const groupInvoices = jest.fn().mockResolvedValue([]);
  const module = await Test.createTestingModule({ imports: [DatabaseModule, DashboardModule] })
    .overrideProvider(PrismaService)
    .useFactory({
      factory: () => {
        const client = {
          user: { findUnique: findUser },
          invoice: { groupBy: groupInvoices },
        };
        created.push(client);
        return client;
      },
    })
    .compile();
  try {
    const shared = module.select(DatabaseModule).get(PrismaService, { strict: true });
    await module.get(DashboardService).getStatistics('owner');
    expect(created).toHaveLength(1);
    expect(shared).toBe(created[0]);
    expect(findUser).toHaveBeenCalledWith({ where: { id: 'owner' } });
    expect(groupInvoices).toHaveBeenCalledTimes(1);
  } finally {
    await module.close();
  }
});
