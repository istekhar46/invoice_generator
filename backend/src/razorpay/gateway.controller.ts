import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateGatewayLinkDto, GatewayLinkQueryDto } from './gateway.dto';
import { GatewayService } from './gateway.service';

@ApiTags('Payment links')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('razorpay/links')
export class GatewayController {
  constructor(private readonly gateway: GatewayService) {}
  @Get() list(@CurrentUser('id') userId: string, @Query() query: GatewayLinkQueryDto) {
    return this.gateway.list(userId, query);
  }
  @Get(':id') detail(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.gateway.detail(userId, id);
  }
  @Post() create(@CurrentUser('id') userId: string, @Body() dto: CreateGatewayLinkDto) {
    return this.gateway.create(userId, dto);
  }
  @Post(':id/refresh') @HttpCode(200) refresh(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.gateway.refresh(userId, id);
  }
  @Post(':id/cancel') @HttpCode(200) cancel(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.gateway.cancel(userId, id);
  }
  @Post(':id/retry') @HttpCode(200) retry(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.gateway.retry(userId, id);
  }
}
