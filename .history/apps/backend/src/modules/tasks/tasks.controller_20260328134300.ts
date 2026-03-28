import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { Request } from 'express';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { TasksService } from './tasks.service';

class CreateTaskDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsString()
  dueDate?: string | null;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}

class UpdateStatusDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Req() req: Request & { user?: RequestUser }, @Body() body: CreateTaskDto) {
    return this.tasksService.create(req.user!, body);
  }

  @Get()
  async findAll(@Req() req: Request & { user?: RequestUser }) {
    return this.tasksService.findAll(req.user!);
  }

  @Get(':taskId')
  async findOne(
    @Req() req: Request & { user?: RequestUser },
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.findOne(req.user!, taskId);
  }

  @Patch(':taskId')
  async update(
    @Req() req: Request & { user?: RequestUser },
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasksService.update(req.user!, taskId, body);
  }

  @Patch(':taskId/status')
  async updateStatus(
    @Req() req: Request & { user?: RequestUser },
    @Param('taskId') taskId: string,
    @Body() body: UpdateStatusDto,
  ) {
    return this.tasksService.updateStatus(req.user!, taskId, body.status);
  }
}
