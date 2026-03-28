import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Role } from '../auth/roles.enum';

interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
}

interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private isManager(actor: RequestUser) {
    return [Role.Admin, Role.HR, Role.Manager, Role.TeamLead].includes(actor.role as Role);
  }

  private async assertAssigneeExists(assigneeId?: string | null) {
    if (!assigneeId) return;
    const user = await this.prisma.user.findUnique({ where: { id: assigneeId } });
    if (!user) {
      throw new BadRequestException('Assignee not found');
    }
  }

  private ensureEmployeeAssignment(actor: RequestUser, assigneeId?: string | null) {
    if (actor.role === Role.Employee && assigneeId && assigneeId !== actor.id) {
      throw new ForbiddenException('Employees can only assign tasks to themselves');
    }
  }

  private canAccessTask(actor: RequestUser, task: { assigneeId: string | null; createdById: string }) {
    if (this.isManager(actor)) return true;
    return task.assigneeId === actor.id || task.createdById === actor.id;
  }

  async create(actor: RequestUser, payload: CreateTaskInput) {
    this.ensureEmployeeAssignment(actor, payload.assigneeId ?? null);
    await this.assertAssigneeExists(payload.assigneeId ?? null);

    const id = `TASK-${randomUUID().slice(0, 8)}`;

    const created = await this.prisma.task.create({
      data: {
        id,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        assigneeId: payload.assigneeId ?? actor.id,
        createdById: actor.id,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        priority: payload.priority ?? TaskPriority.medium,
      },
      include: {
        assignee: true,
        createdBy: true,
      },
    });

    return {
      data: created,
      message: 'Task created',
    };
  }

  async findAll(actor: RequestUser) {
    const where: Prisma.TaskWhereInput = this.isManager(actor)
      ? {}
      : {
          OR: [{ assigneeId: actor.id }, { createdById: actor.id }],
        };

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignee: true,
        createdBy: true,
      },
    });

    return {
      data: tasks,
      message: 'Tasks fetched',
    };
  }

  async findOne(actor: RequestUser, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
        createdBy: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!this.canAccessTask(actor, task)) {
      throw new ForbiddenException('You cannot access this task');
    }

    return {
      data: task,
      message: 'Task detail',
    };
  }

  async update(actor: RequestUser, taskId: string, payload: UpdateTaskInput) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!this.canAccessTask(actor, task)) {
      throw new ForbiddenException('You cannot edit this task');
    }

    if (!this.isManager(actor) && payload.assigneeId && payload.assigneeId !== task.assigneeId) {
      this.ensureEmployeeAssignment(actor, payload.assigneeId);
    }

    if (payload.assigneeId && payload.assigneeId !== task.assigneeId) {
      await this.assertAssigneeExists(payload.assigneeId);
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: payload.title?.trim() ?? task.title,
        description: payload.description === undefined ? task.description : payload.description?.trim() || null,
        assigneeId: payload.assigneeId ?? task.assigneeId,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : payload.dueDate === null ? null : task.dueDate,
        priority: payload.priority ?? task.priority,
        status: payload.status ?? task.status,
      },
      include: {
        assignee: true,
        createdBy: true,
      },
    });

    return {
      data: updated,
      message: 'Task updated',
    };
  }

  async updateStatus(actor: RequestUser, taskId: string, status: TaskStatus) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!this.canAccessTask(actor, task)) {
      throw new ForbiddenException('You cannot update this task');
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status },
      include: {
        assignee: true,
        createdBy: true,
      },
    });

    return {
      data: updated,
      message: 'Status updated',
    };
  }
}
