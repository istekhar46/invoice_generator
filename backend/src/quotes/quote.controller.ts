import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuoteService } from './quote.service';
import {
  ConvertQuoteDto,
  CreateQuoteDto,
  QuoteQueryDto,
  QuoteStatusDto,
  UpdateQuoteDto,
} from './quote.dto';
@ApiTags('Quotations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('quotes')
export class QuoteController {
  constructor(private readonly quotes: QuoteService) {}
  @Get() list(@CurrentUser('id') userId: string, @Query() query: QuoteQueryDto) {
    return this.quotes.list(userId, query);
  }
  @Post() create(@CurrentUser('id') userId: string, @Body() dto: CreateQuoteDto) {
    return this.quotes.create(userId, dto);
  }
  @Get(':id') detail(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.quotes.findById(userId, id);
  }
  @Put(':id') update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotes.update(userId, id, dto);
  }
  @Patch(':id/status') status(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: QuoteStatusDto,
  ) {
    return this.quotes.status(userId, id, dto);
  }
  @Post(':id/convert') convert(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ConvertQuoteDto,
  ) {
    return this.quotes.convert(userId, id, dto);
  }
}
