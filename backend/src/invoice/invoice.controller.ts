import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { plainToClass } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceOwnershipGuard } from '../auth/guards/resource-ownership.guard';
import { ResourceOwnership } from '../auth/decorators/resource-ownership.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvoiceService } from './invoice.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  UpdateInvoiceStatusDto,
  InvoiceResponseDto,
  InvoiceQueryDto,
  PaginatedResponseDto,
} from './dto';

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User or customer not found',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createInvoiceDto: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceService.create(userId, createInvoiceDto);
    return plainToClass(InvoiceResponseDto, invoice, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices with optional filtering and pagination' })
  @ApiQuery({ type: InvoiceQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved successfully',
    type: PaginatedResponseDto<InvoiceResponseDto>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: InvoiceQueryDto,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    const result = await this.invoiceService.findAll(userId, query);
    
    return {
      ...result,
      data: result.data.map(invoice =>
        plainToClass(InvoiceResponseDto, invoice, {
          excludeExtraneousValues: true,
        })
      ),
    };
  }

  @Get(':id')
  @ResourceOwnership({ entity: 'invoice', param: 'id' })
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    example: 'cuid123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceService.findById(userId, id);
    return plainToClass(InvoiceResponseDto, invoice, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @ResourceOwnership({ entity: 'invoice', param: 'id' })
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    example: 'cuid123456789',
  })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiResponse({
    status: 200,
    description: 'Invoice updated successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const updatedInvoice = await this.invoiceService.update(
      userId,
      id,
      updateInvoiceDto,
    );
    return plainToClass(InvoiceResponseDto, updatedInvoice, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/status')
  @ResourceOwnership({ entity: 'invoice', param: 'id' })
  @ApiOperation({ summary: 'Update invoice status' })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    example: 'cuid123456789',
  })
  @ApiBody({ type: UpdateInvoiceStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Invoice status updated successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateInvoiceStatusDto,
  ): Promise<InvoiceResponseDto> {
    const updatedInvoice = await this.invoiceService.updateStatus(
      userId,
      id,
      updateStatusDto,
    );
    return plainToClass(InvoiceResponseDto, updatedInvoice, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ResourceOwnership({ entity: 'invoice', param: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    example: 'cuid123456789',
  })
  @ApiResponse({
    status: 204,
    description: 'Invoice deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.invoiceService.delete(userId, id);
  }
}