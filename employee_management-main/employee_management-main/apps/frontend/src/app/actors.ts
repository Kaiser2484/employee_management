export type ActorRole = 'admin' | 'hr' | 'manager' | 'team_lead' | 'employee';

export interface Actor {
  id: string;
  fullName: string;
  email: string | null;
  role: ActorRole;
}
