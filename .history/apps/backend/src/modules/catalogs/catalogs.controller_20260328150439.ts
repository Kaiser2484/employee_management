import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CatalogView, CatalogsService } from './catalogs.service';

class UpsertCatalogItemDto {
  @IsString()
  @MinLength(1)
  value!: string;
}

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  async findAll() {
    return this.catalogsService.getAllCatalogs();
  }

  @Post(':type')
  @Roles(Role.Admin)
  async addItem(@Param('type') type: CatalogView, @Body() body: UpsertCatalogItemDto) {
    return this.catalogsService.addItem(type, body.value);
  }

  @Delete(':type')
  @Roles(Role.Admin)
  async removeItem(@Param('type') type: CatalogView, @Body() body: UpsertCatalogItemDto) {
    return this.catalogsService.removeItem(type, body.value);
  }
}
