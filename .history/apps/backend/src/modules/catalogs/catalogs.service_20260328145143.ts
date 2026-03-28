import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';

export type CatalogView = 'job-title' | 'departments' | 'employee-status' | 'job-categories';

type CatalogMap = Record<CatalogView, string[]>;

const catalogTypeMap: Record<CatalogView, CatalogType> = {
  'job-title': CatalogType.job_title,
  departments: CatalogType.department,
  'employee-status': CatalogType.employee_status,
  'job-categories': CatalogType.job_category,
};

const reverseCatalogTypeMap: Record<CatalogType, CatalogView> = {
  [CatalogType.job_title]: 'job-title',
  [CatalogType.department]: 'departments',
  [CatalogType.employee_status]: 'employee-status',
  [CatalogType.job_category]: 'job-categories',
};

@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCatalogs() {
    const rows = await this.prisma.adminCatalogItem.findMany({
      orderBy: [{ type: 'asc' }, { value: 'asc' }],
      select: { type: true, value: true },
    });

    const data: CatalogMap = {
      'job-title': [],
      departments: [],
      'employee-status': [],
      'job-categories': [],
    };

    for (const row of rows) {
      data[reverseCatalogTypeMap[row.type]].push(row.value);
    }

    return {
      data,
      message: 'Catalogs loaded successfully',
    };
  }

  async addItem(type: CatalogView, value: string) {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      throw new BadRequestException('Catalog value is required');
    }

    const catalogType = catalogTypeMap[type];

    const exists = await this.prisma.adminCatalogItem.findFirst({
      where: {
        type: catalogType,
        value: {
          equals: normalizedValue,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException('Catalog item already exists');
    }

    const created = await this.prisma.adminCatalogItem.create({
      data: {
        id: randomUUID(),
        type: catalogType,
        value: normalizedValue,
      },
      select: { type: true, value: true },
    });

    return {
      data: {
        type: reverseCatalogTypeMap[created.type],
        value: created.value,
      },
      message: 'Catalog item added successfully',
    };
  }

  async removeItem(type: CatalogView, value: string) {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      throw new BadRequestException('Catalog value is required');
    }

    const catalogType = catalogTypeMap[type];

    const found = await this.prisma.adminCatalogItem.findFirst({
      where: {
        type: catalogType,
        value: {
          equals: normalizedValue,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException('Catalog item not found');
    }

    await this.prisma.adminCatalogItem.delete({ where: { id: found.id } });

    return {
      data: {
        type,
        value: normalizedValue,
      },
      message: 'Catalog item removed successfully',
    };
  }
}
