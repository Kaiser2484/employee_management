import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { AccessScopeService } from '../access/access-scope.service';
import { PrismaService } from '../database/prisma.service';
import { Role } from '../auth/roles.enum';

type CreateEmployeeInput = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  degree: string;
  departmentId?: string;
  teamId?: string;
  gender?: string;
  dateOfBirth?: string;
  startDate?: string;
  nationalId?: string;
  address?: string;
  employeeStatus?: string;
  jobCategory?: string;
  jobTitle?: string;
  photoUrl?: string;
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly accessScopeService: AccessScopeService,
    private readonly prisma: PrismaService,
  ) {}

  private async generateNextEmployeeCode() {
    const latest = await this.prisma.user.findFirst({
      where: { id: { startsWith: 'NV' } },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    let nextNumber = 1;
    if (latest?.id) {
      const match = /^NV(\d{6})$/.exec(latest.id);
      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    while (true) {
      const candidate = `NV${String(nextNumber).padStart(6, '0')}`;
      const exists = await this.prisma.user.findUnique({
        where: { id: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      nextNumber += 1;
    }
  }

  async create(actor: RequestUser, payload: CreateEmployeeInput) {
    await this.accessScopeService.getActorOrThrow(actor);

    const normalizedEmail = payload.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const newId = await this.generateNextEmployeeCode();

    const passwordHash = await hash(payload.password, 10);
    const created = await this.prisma.user.create({
      data: {
        id: newId,
        fullName: payload.fullName.trim(),
        degree: payload.degree.trim(),
        email: normalizedEmail,
        passwordHash,
        role: payload.role as any,
        departmentId: payload.departmentId?.trim() || null,
        teamId: payload.teamId?.trim() || null,
        gender: payload.gender || null,
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        nationalId: payload.nationalId || null,
        address: payload.address || null,
        employeeStatus: payload.employeeStatus || null,
        jobCategory: payload.jobCategory || null,
        jobTitle: payload.jobTitle || null,
        photoUrl: payload.photoUrl || null,
      },
      select: {
        id: true,
        fullName: true,
        degree: true,
        email: true,
        role: true,
        departmentId: true,
        teamId: true,
        gender: true,
        dateOfBirth: true,
        startDate: true,
        nationalId: true,
        address: true,
        employeeStatus: true,
        jobCategory: true,
        jobTitle: true,
        photoUrl: true,
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
        degree: true,
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
