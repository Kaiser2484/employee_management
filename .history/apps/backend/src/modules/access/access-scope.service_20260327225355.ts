import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Role } from '../auth/roles.enum';
import { PrismaService } from '../database/prisma.service';

type ScopedUser = {
  id: string;
  fullName: string;
  email: string | null;
  degree: string | null;
  role: string;
  departmentId: string | null;
  teamId: string | null;
};

const scopedUserSelect = {
  id: true,
  fullName: true,
  email: true,
  degree: true,
  role: true,
  departmentId: true,
  teamId: true,
} as const;

@Injectable()
export class AccessScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async getActorOrThrow(actor: RequestUser) {
    const actorOrg = await this.prisma.user.findUnique({
      where: { id: actor.id },
    });

    if (!actorOrg) {
      throw new NotFoundException(`Actor ${actor.id} does not exist in organization schema`);
    }

    if (actorOrg.role !== actor.role) {
      throw new ForbiddenException(
        `Role mismatch for ${actor.id}. Header role ${actor.role} does not match organization role ${actorOrg.role}`,
      );
    }

    return actorOrg;
  }

  async getUserByIdOrThrow(userId: string): Promise<ScopedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: scopedUserSelect,
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user;
  }

  async canAccessTarget(actor: RequestUser, targetUserId: string): Promise<boolean> {
    const actorOrg = await this.getActorOrThrow(actor);
    const target = await this.getUserByIdOrThrow(targetUserId);

    if (actorOrg.role === Role.Admin || actorOrg.role === Role.HR) {
      return true;
    }

    if (actorOrg.role === Role.Manager) {
      return !!actorOrg.departmentId && actorOrg.departmentId === target.departmentId;
    }

    if (actorOrg.role === Role.TeamLead) {
      return !!actorOrg.teamId && actorOrg.teamId === target.teamId;
    }

    return actorOrg.id === target.id;
  }

  async listVisibleUsers(actor: RequestUser): Promise<ScopedUser[]> {
    const actorOrg = await this.getActorOrThrow(actor);

    if (actorOrg.role === Role.Admin || actorOrg.role === Role.HR) {
      return this.prisma.user.findMany({
        select: scopedUserSelect,
        orderBy: { id: 'asc' },
      });
    }

    if (actorOrg.role === Role.Manager && actorOrg.departmentId) {
      return this.prisma.user.findMany({
        where: {
          departmentId: actorOrg.departmentId,
        },
        select: scopedUserSelect,
        orderBy: { id: 'asc' },
      });
    }

    if (actorOrg.role === Role.TeamLead && actorOrg.teamId) {
      return this.prisma.user.findMany({
        where: {
          teamId: actorOrg.teamId,
        },
        select: scopedUserSelect,
        orderBy: { id: 'asc' },
      });
    }

    return this.prisma.user.findMany({
      where: {
        id: actorOrg.id,
      },
      select: scopedUserSelect,
    });
  }
}
