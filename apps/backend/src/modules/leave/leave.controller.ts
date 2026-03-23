import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { LeaveService } from './leave.service';

@Controller('leave/requests')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Roles(Role.Admin, Role.HR, Role.Manager, Role.TeamLead, Role.Employee)
  @Get()
  async findAllRequests(@Req() req: Request & { user?: RequestUser }) {
    return this.leaveService.findAllRequests(req.user!);
  }

  @Roles(Role.Admin, Role.HR, Role.Manager, Role.TeamLead)
  @Patch(':requestId/approve')
  async approveRequest(
    @Req() req: Request & { user?: RequestUser },
    @Param('requestId') requestId: string,
  ) {
    return this.leaveService.approveRequest(req.user!, requestId);
  }
}
