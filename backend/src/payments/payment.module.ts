import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
@Module({
  imports: [DatabaseModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
// Nest registers modules through decorated classes.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PaymentModule {}
