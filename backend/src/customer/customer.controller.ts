import {
  Controller,
  Get,
  Post,
  Put,
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
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  CustomerQueryDto,
  PaginatedResponseDto,
} from './dto';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
    type: CustomerResponseDto,
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
    description: 'User not found',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.create(userId, createCustomerDto);
    return plainToClass(CustomerResponseDto, customer, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers with optional search and pagination' })
  @ApiQuery({ type: CustomerQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Customers retrieved successfully',
    type: PaginatedResponseDto<CustomerResponseDto>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: CustomerQueryDto,
  ): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    const result = await this.customerService.findAll(userId, query);

    return {
      ...result,
      data: result.data.map((customer) =>
        plainToClass(CustomerResponseDto, customer, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }

  @Get(':id')
  @ResourceOwnership({ entity: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: 'cuid123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer retrieved successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.findById(userId, id);
    return plainToClass(CustomerResponseDto, customer, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @ResourceOwnership({ entity: 'customer', param: 'id' })
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: 'cuid123456789',
  })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully',
    type: CustomerResponseDto,
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
    description: 'Customer not found',
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const updatedCustomer = await this.customerService.update(userId, id, updateCustomerDto);
    return plainToClass(CustomerResponseDto, updatedCustomer, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ResourceOwnership({ entity: 'customer', param: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: 'cuid123456789',
  })
  @ApiResponse({
    status: 204,
    description: 'Customer deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete customer with existing invoices',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<void> {
    await this.customerService.delete(userId, id);
  }
}
