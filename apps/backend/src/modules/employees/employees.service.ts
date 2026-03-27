import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { AccessScopeService } from '../access/access-scope.service';
import { PrismaService } from '../database/prisma.service';
import { Role } from '../auth/roles.enum';

type CreateEmployeeInput = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  departmentId?: string;
  teamId?: string;
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly accessScopeService: AccessScopeService,
    private readonly prisma: PrismaService,
  ) {}

  async create(actor: RequestUser, payload: CreateEmployeeInput) {
    await this.accessScopeService.getActorOrThrow(actor);

    const normalizedEmail = payload.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hash(payload.password, 10);
    const created = await this.prisma.user.create({
      data: {
        id: `usr-${randomUUID().slice(0, 8)}`,
        fullName: payload.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: payload.role as any,
        departmentId: payload.departmentId?.trim() || null,
        teamId: payload.teamId?.trim() || null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        departmentId: true,
        teamId: true,
      },
    });

    return {
      data: created,
      message: 'Employee created successfully',
    };
  }

  async findAll(actor: RequestUser) {
    const actorOrg = await this.accessScopeService.getActorOrThrow(actor);
    const visibleUsers = await this.accessScopeService.listVisibleUsers(actor);

    return {
      data: visibleUsers,
      scope: {
        actorId: actorOrg.id,
        actorRole: actorOrg.role,
      },
      message: 'Employees filtered by role scope',
    };
  }

  async findOne(actor: RequestUser, employeeId: string) {
    const canAccess = await this.accessScopeService.canAccessTarget(actor, employeeId);

    if (!canAccess) {
      throw new ForbiddenException('You can only access employees in your permitted scope');
    }

    return {
      data: await this.accessScopeService.getUserByIdOrThrow(employeeId),
      message: 'Employee detail in your scope',
    };
  }

  async updateRole(actor: RequestUser, employeeId: string, role: Role) {
    const actorOrg = await this.accessScopeService.getActorOrThrow(actor);

    if (actorOrg.role !== Role.Admin) {
      throw new ForbiddenException('Only admin can update user roles');
    }

    const targetUser = await this.accessScopeService.getUserByIdOrThrow(employeeId);
    if (targetUser.id === actor.id && role !== Role.Admin) {
      throw new BadRequestException('Admin cannot remove their own admin role');
    }

    if (targetUser.role === role) {
      throw new ConflictException('Target user already has this role');
    }

    const updated = await this.prisma.user.update({
      where: { id: employeeId },
      data: { role: role as any },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        departmentId: true,
        teamId: true,
      },
    });

    return {
      data: updated,
      message: 'User role updated successfully',
    };
  }
}
