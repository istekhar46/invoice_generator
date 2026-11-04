import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { RazorpayController } from './razorpay.controller';
import { RazorpayProvider } from './razorpay-provider';
import { RazorpaySecrets } from './razorpay-secrets';
import { RazorpayService } from './razorpay.service';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { GatewayWebhookController } from './gateway-webhook.controller';
import { GatewayWebhookService } from './gateway-webhook.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [RazorpayController, GatewayController, GatewayWebhookController],
  providers: [
    RazorpayProvider,
    RazorpaySecrets,
    RazorpayService,
    GatewayService,
    GatewayWebhookService,
  ],
})
// Nest registers modules through decorated classes.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RazorpayModule {}
