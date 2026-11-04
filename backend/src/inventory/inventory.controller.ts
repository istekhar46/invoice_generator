import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import {
  AdjustStockDto,
  InventoryBalanceQueryDto,
  InventoryHistoryQueryDto,
  OpeningStockDto,
  StockRequestDto,
} from './inventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('products')
  balances(@CurrentUser('id') userId: string, @Query() query: InventoryBalanceQueryDto) {
    return this.inventory.balances(userId, query);
  }

  @Get('products/:id/balance')
  balance(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.inventory.balance(userId, id);
  }

  @Get('history')
  history(@CurrentUser('id') userId: string, @Query() query: InventoryHistoryQueryDto) {
    return this.inventory.history(userId, query);
  }

  @Post('products/:id/opening')
  opening(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: OpeningStockDto,
  ) {
    return this.inventory.opening(userId, id, dto);
  }

  @Post('products/:id/adjustments')
  adjust(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventory.adjust(userId, id, dto);
  }

  @Post('adjustments/:id/reversal')
  reverse(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: StockRequestDto,
  ) {
    return this.inventory.reverse(userId, id, dto);
  }
}
