import { ActorRole } from './actors';

export type AppRoute = '/employees' | '/leave' | '/recruitment' | '/administration';

const employeesRoles: ActorRole[] = ['admin', 'hr', 'manager', 'team_lead'];
const leaveRoles: ActorRole[] = ['admin', 'hr', 'manager', 'team_lead', 'employee'];
const recruitmentRoles: ActorRole[] = ['admin', 'hr', 'manager'];
const administrationRoles: ActorRole[] = ['admin'];

export function canAccessEmployees(role: ActorRole): boolean {
  return employeesRoles.includes(role);
}

export function canAccessLeave(role: ActorRole): boolean {
  return leaveRoles.includes(role);
}

export function canAccessRecruitment(role: ActorRole): boolean {
  return recruitmentRoles.includes(role);
}

export function canAccessAdministration(role: ActorRole): boolean {
  return administrationRoles.includes(role);
}

export function getAllowedRoutes(role: ActorRole): AppRoute[] {
  const routes: AppRoute[] = [];

  if (canAccessEmployees(role)) {
    routes.push('/employees');
  }

  if (canAccessLeave(role)) {
    routes.push('/leave');
  }

  if (canAccessRecruitment(role)) {
    routes.push('/recruitment');
  }

  if (canAccessAdministration(role)) {
    routes.push('/administration');
  }

  return routes;
}
