import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvoiceDefaultsDto } from './dto/invoice-defaults.dto';
import { InvoiceDefaultsService } from './invoice-defaults.service';

@ApiTags('Invoice defaults')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('invoice-defaults')
export class InvoiceDefaultsController {
  constructor(private readonly defaults: InvoiceDefaultsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current account invoice defaults' })
  get(@CurrentUser('id') userId: string): Promise<InvoiceDefaultsDto | null> {
    return this.defaults.get(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Replace the current account invoice defaults' })
  save(
    @CurrentUser('id') userId: string,
    @Body() data: InvoiceDefaultsDto,
  ): Promise<InvoiceDefaultsDto> {
    return this.defaults.save(userId, data);
  }
}
