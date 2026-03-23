import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequest as PrismaLeaveRequest, LeaveStatus } from '@prisma/client';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Role } from '../auth/roles.enum';
import { AccessScopeService } from '../access/access-scope.service';
import { PrismaService } from '../database/prisma.service';

export type LeaveRequest = PrismaLeaveRequest;

@Injectable()
export class LeaveService {
  constructor(
    private readonly accessScopeService: AccessScopeService,
    private readonly prisma: PrismaService,
  ) {}

  async findAllRequests(actor: RequestUser) {
    const visibleUsers = await this.accessScopeService.listVisibleUsers(actor);
    const visibleUserIds = visibleUsers.map((item) => item.id);

    const data = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId: {
          in: visibleUserIds,
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return {
      data,
      message: 'Leave requests filtered by role scope',
    };
  }

  async approveRequest(actor: RequestUser, requestId: string) {
    if (actor.role === Role.Employee) {
      throw new ForbiddenException('Employee cannot approve leave requests');
    }

    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Leave request ${requestId} not found`);
    }

    const canApprove = await this.accessScopeService.canAccessTarget(actor, request.employeeId);

    if (!canApprove) {
      throw new ForbiddenException('You can only approve leave requests in your scope');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: LeaveStatus.approved },
    });

    return {
      data: updated,
      message: 'Leave request approved',
    };
  }
}
