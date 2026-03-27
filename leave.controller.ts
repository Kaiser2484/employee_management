import { Controller, Get, Param, Patch, Req, Post, Body } from '@nestjs/common';
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

  @Post()
  async createRequest(
    @Req() req: Request & { user?: RequestUser },
    @Body() body: any,
  ) {
    return this.leaveService.createRequest(req.user!, body);
  }

  @Roles(Role.Admin, Role.HR, Role.Manager, Role.TeamLead)
  @Patch(':requestId/approve')
  async approveRequest(
    @Req() req: Request & { user?: RequestUser },
    @Param('requestId') requestId: string,
  ) {
    return this.leaveService.approveRequest(req.user!, requestId);
  }

  @Roles(Role.Admin, Role.HR, Role.Manager, Role.TeamLead)
  @Patch(':requestId/reject')
  async rejectRequest(
    @Req() req: Request & { user?: RequestUser },
    @Param('requestId') requestId: string,
  ) {
    return this.leaveService.rejectRequest(req.user!, requestId);
  }
}
