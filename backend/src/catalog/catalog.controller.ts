import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CatalogService } from './catalog.service';
import { CatalogQueryDto, CreateCatalogItemDto, UpdateCatalogItemDto } from './catalog.dto';

@ApiTags('Products & Services')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string, @Query() query: CatalogQueryDto) {
    return this.catalog.findAll(userId, query);
  }

  @Get(':id')
  findById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.catalog.findById(userId, id);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCatalogItemDto) {
    return this.catalog.create(userId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCatalogItemDto,
  ) {
    return this.catalog.update(userId, id, dto);
  }
}
