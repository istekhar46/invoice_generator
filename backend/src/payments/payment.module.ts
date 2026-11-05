import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { DirectUpiController } from './direct-upi.controller';
import { DirectUpiService } from './direct-upi.service';
@Module({
  imports: [DatabaseModule],
  controllers: [PaymentController, DirectUpiController],
  providers: [PaymentService, DirectUpiService],
  exports: [PaymentService],
})
// Nest registers modules through decorated classes.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PaymentModule {}
