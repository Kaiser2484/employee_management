import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../interfaces/request-user.interface';
import { Role, allRoles } from '../roles.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const userId = request.header('x-user-id');
    const roleHeader = request.header('x-user-role')?.toLowerCase();

    if (!userId || !roleHeader) {
      throw new UnauthorizedException(
        'Missing authentication headers: x-user-id and x-user-role',
      );
    }

    if (!allRoles.includes(roleHeader as Role)) {
      throw new UnauthorizedException(
        'Invalid role. Allowed roles: admin, hr, manager, team_lead, employee',
      );
    }

    request.user = {
      id: userId,
      role: roleHeader as Role,
    };

    return true;
  }
}
