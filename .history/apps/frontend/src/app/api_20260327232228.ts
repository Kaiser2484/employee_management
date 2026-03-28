import { Actor } from './actors';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

interface ApiError extends Error {
  status?: number;
}

async function request<T>(path: string, actor: Actor, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': actor.id,
      'x-user-role': actor.role,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`) as ApiError;
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`) as ApiError;
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  return publicRequest<{ user: Actor; message: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export interface EmployeeItem {
  id: string;
  fullName: string;
  email: string | null;
  degree: string | null;
  role: string;
  departmentId: string | null;
  teamId: string | null;
  degreeFiles?: Array<{ name: string; url: string }>;
  gender?: string | null;
  dateOfBirth?: string | null;
  startDate?: string | null;
  nationalId?: string | null;
  address?: string | null;
  employeeStatus?: string | null;
  jobCategory?: string | null;
  jobTitle?: string | null;
  photoUrl?: string | null;
}

export type EmployeeRole = 'admin' | 'hr' | 'manager' | 'team_lead' | 'employee';

export interface CreateEmployeePayload {
  fullName: string;
  email: string;
  password: string;
  role: EmployeeRole;
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
}

export interface UpdateEmployeeRolePayload {
  role: EmployeeRole;
}

export interface LeaveRequestItem {
  id: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  status: 'pending' | 'approved';
}

export async function getEmployees(actor: Actor) {
  return request<{ data: EmployeeItem[]; message: string }>('/employees', actor);
}

export async function createEmployee(actor: Actor, payload: CreateEmployeePayload) {
  return request<{ data: EmployeeItem; message: string }>('/employees', actor, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEmployeeRole(actor: Actor, employeeId: string, payload: UpdateEmployeeRolePayload) {
  return request<{ data: EmployeeItem; message: string }>(`/employees/${employeeId}/role`, actor, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getLeaveRequests(actor: Actor) {
  return request<{ data: LeaveRequestItem[]; message: string }>('/leave/requests', actor);
}

export async function approveLeaveRequest(actor: Actor, requestId: string) {
  return request<{ data: LeaveRequestItem; message: string }>(
    `/leave/requests/${requestId}/approve`,
    actor,
    { method: 'PATCH' },
  );
}
