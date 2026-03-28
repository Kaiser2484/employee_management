import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { EmployeesService } from './employees.service';

class CreateEmployeeDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @MinLength(2)
  degree!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  employeeStatus?: string;

  @IsOptional()
  @IsString()
  jobCategory?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

class UpdateEmployeeRoleDto {
  @IsEnum(Role)
  role!: Role;
}

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Roles(Role.Admin, Role.HR)
  @Post()
  async create(
    @Req() req: Request & { user?: RequestUser },
    @Body() body: CreateEmployeeDto,
  ) {
    return this.employeesService.create(req.user!, body);
  }

  @Roles(Role.Admin, Role.HR, Role.Manager, Role.TeamLead)
  @Get()
  async findAll(@Req() req: Request & { user?: RequestUser }) {
    return this.employeesService.findAll(req.user!);
  }

  @Roles(Role.Admin, Role.HR, Role.Manager, Role.TeamLead, Role.Employee)
  @Get(':employeeId')
  async findOne(
    @Req() req: Request & { user?: RequestUser },
    @Param('employeeId') employeeId: string,
  ) {
    return this.employeesService.findOne(req.user!, employeeId);
  }

  @Roles(Role.Admin)
  @Patch(':employeeId/role')
  async updateRole(
    @Req() req: Request & { user?: RequestUser },
    @Param('employeeId') employeeId: string,
    @Body() body: UpdateEmployeeRoleDto,
  ) {
    return this.employeesService.updateRole(req.user!, employeeId, body.role);
  }
}
