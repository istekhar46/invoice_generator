import { Controller, Headers, HttpCode, Param, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { GatewayWebhookService } from './gateway-webhook.service';

@Controller('razorpay/webhooks')
export class GatewayWebhookController {
  constructor(private readonly webhooks: GatewayWebhookService) {}
  @Public()
  @Post(':connectionId')
  @HttpCode(200)
  receive(
    @Param('connectionId') id: string,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventId: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.webhooks.receive(id, signature, eventId, request.rawBody);
  }
}
