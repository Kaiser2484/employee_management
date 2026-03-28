import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Role } from '../auth/roles.enum';

interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeIds?: string[];
  dueDate?: string | null;
  priority?: TaskPriority;
}

interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  assigneeIds?: string[];
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

  private async assertAssigneesExist(assigneeIds: string[]) {
    if (!assigneeIds.length) return;
    const users = await this.prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true },
    });
    if (users.length !== assigneeIds.length) {
      throw new BadRequestException('One or more assignees were not found');
    }
  }

  private ensureEmployeeAssignment(actor: RequestUser, assigneeIds: string[]) {
    if (actor.role === Role.Employee && assigneeIds.some((assigneeId) => assigneeId !== actor.id)) {
      throw new ForbiddenException('Employees can only assign tasks to themselves');
    }
  }

  private canAccessTask(
    actor: RequestUser,
    task: { createdById: string; assignees?: Array<{ assigneeId: string }> },
  ) {
    if (this.isManager(actor)) return true;
    const isAssignee = task.assignees?.some((item) => item.assigneeId === actor.id) ?? false;
    return isAssignee || task.createdById === actor.id;
  }

  private normalizeAssigneeIds(input?: string[]) {
    const cleaned = (input ?? [])
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return [...new Set(cleaned)];
  }

  async create(actor: RequestUser, payload: CreateTaskInput) {
    const assigneeIds = this.normalizeAssigneeIds(payload.assigneeIds);
    const finalAssigneeIds = assigneeIds.length ? assigneeIds : [actor.id];
    this.ensureEmployeeAssignment(actor, finalAssigneeIds);
    await this.assertAssigneesExist(finalAssigneeIds);

    const id = `TASK-${randomUUID().slice(0, 8)}`;

    const created = await this.prisma.task.create({
      data: {
        id,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        assignees: {
          createMany: {
            data: finalAssigneeIds.map((assigneeId) => ({ assigneeId })),
          },
        },
        createdById: actor.id,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        priority: payload.priority ?? TaskPriority.medium,
      },
      include: {
        assignees: {
          include: {
            assignee: true,
          },
        },
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
          OR: [{ assignees: { some: { assigneeId: actor.id } } }, { createdById: actor.id }],
        };

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignees: {
          include: {
            assignee: true,
          },
        },
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
        assignees: {
          include: {
            assignee: true,
          },
        },
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
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: true,
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!this.canAccessTask(actor, task)) {
      throw new ForbiddenException('You cannot edit this task');
    }

    const nextAssigneeIds = payload.assigneeIds
      ? this.normalizeAssigneeIds(payload.assigneeIds)
      : task.assignees.map((item) => item.assigneeId);

    if (!this.isManager(actor)) {
      this.ensureEmployeeAssignment(actor, nextAssigneeIds);
    }
    await this.assertAssigneesExist(nextAssigneeIds);

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: payload.title?.trim() ?? task.title,
        description: payload.description === undefined ? task.description : payload.description?.trim() || null,
        assignees: payload.assigneeIds
          ? {
              deleteMany: {},
              createMany: {
                data: nextAssigneeIds.map((assigneeId) => ({ assigneeId })),
              },
            }
          : undefined,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : payload.dueDate === null ? null : task.dueDate,
        priority: payload.priority ?? task.priority,
        status: payload.status ?? task.status,
      },
      include: {
        assignees: {
          include: {
            assignee: true,
          },
        },
        createdBy: true,
      },
    });

    return {
      data: updated,
      message: 'Task updated',
    };
  }

  async updateStatus(actor: RequestUser, taskId: string, status: TaskStatus) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: true,
      },
    });
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
        assignees: {
          include: {
            assignee: true,
          },
        },
        createdBy: true,
      },
    });

    return {
      data: updated,
      message: 'Status updated',
    };
  }

  async searchAssignees(actor: RequestUser, query: string) {
    const keyword = query.trim();

    if (actor.role === Role.Employee) {
      const self = await this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { id: true, fullName: true, email: true, role: true },
      });
      return {
        data: self ? [self] : [],
        message: 'Assignees fetched',
      };
    }

    const users = await this.prisma.user.findMany({
      where: keyword
        ? {
            OR: [
              { id: { contains: keyword, mode: 'insensitive' } },
              { fullName: { contains: keyword, mode: 'insensitive' } },
              { email: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {},
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: [{ fullName: 'asc' }],
      take: 20,
    });

    return {
      data: users,
      message: 'Assignees fetched',
    };
  }
}
