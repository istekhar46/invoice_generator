import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RazorpayMode } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaveRazorpayConnectionDto } from './razorpay.dto';
import { RazorpayService } from './razorpay.service';
import { WebhookSecretDto } from './gateway.dto';

@ApiTags('Razorpay setup')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('razorpay/connections')
export class RazorpayController {
  constructor(private readonly razorpay: RazorpayService) {}
  @Post(':mode/webhook')
  webhook(
    @CurrentUser('id') userId: string,
    @Param('mode', new ParseEnumPipe(RazorpayMode)) mode: RazorpayMode,
    @Body() dto: WebhookSecretDto,
  ) {
    return this.razorpay.webhook(userId, mode, dto.secret);
  }

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.razorpay.list(userId);
  }

  @Put(':mode')
  save(
    @CurrentUser('id') userId: string,
    @Param('mode', new ParseEnumPipe(RazorpayMode)) mode: RazorpayMode,
    @Body() dto: SaveRazorpayConnectionDto,
  ) {
    return this.razorpay.save(userId, mode, dto);
  }

  @Post(':mode/verify')
  verify(
    @CurrentUser('id') userId: string,
    @Param('mode', new ParseEnumPipe(RazorpayMode)) mode: RazorpayMode,
  ) {
    return this.razorpay.verify(userId, mode);
  }

  @Delete(':mode')
  disable(
    @CurrentUser('id') userId: string,
    @Param('mode', new ParseEnumPipe(RazorpayMode)) mode: RazorpayMode,
  ) {
    return this.razorpay.disable(userId, mode);
  }
}
