import { Actor } from './actors';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002/api';

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

async function requestForm<T>(path: string, actor: Actor, form: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: form,
    headers: {
      'x-user-id': actor.id,
      'x-user-role': actor.role,
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

export async function updateProfile(actor: Actor, payload: { fullName?: string; email?: string; avatarUrl?: string | null }) {
  return request<{ user: Actor; message: string }>('/profile/update', actor, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePassword(actor: Actor, payload: { currentPassword: string; newPassword: string }) {
  return request<{ message: string }>('/profile/password', actor, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadAvatar(actor: Actor, file: File) {
  const form = new FormData();
  form.append('file', file);
  return requestForm<{ url: string; user: Actor; message: string }>('/profile/avatar', actor, form);
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
  employeeName?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  attachment?: string;
  createdAt: string;
}

export interface CreateLeavePayload {
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason?: string;
  attachment?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskUser {
  id: string;
  fullName: string;
  email: string | null;
  role: EmployeeRole;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeIds: string[];
  assignees: TaskUser[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: TaskUser;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assigneeIds?: string[];
  dueDate?: string | null;
  priority?: TaskPriority;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  assigneeIds?: string[];
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface TaskAssigneeOption {
  id: string;
  fullName: string;
  email: string | null;
  role: EmployeeRole;
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

export async function rejectLeaveRequest(actor: Actor, requestId: string) {
  return request<{ data: LeaveRequestItem; message: string }>(
    `/leave/requests/${requestId}/reject`,
    actor,
    { method: 'PATCH' },
  );
}

export async function createLeaveRequest(actor: Actor, payload: CreateLeavePayload) {
  return request<{ data: LeaveRequestItem; message: string }>(
    `/leave/requests`,
    actor,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function getTasks(actor: Actor) {
  return request<{ data: TaskItem[]; message: string }>(`/tasks`, actor);
}

export async function createTask(actor: Actor, payload: CreateTaskPayload) {
  return request<{ data: TaskItem; message: string }>(`/tasks`, actor, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTask(actor: Actor, taskId: string, payload: UpdateTaskPayload) {
  return request<{ data: TaskItem; message: string }>(`/tasks/${taskId}`, actor, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateTaskStatus(actor: Actor, taskId: string, status: TaskStatus) {
  return request<{ data: TaskItem; message: string }>(`/tasks/${taskId}/status`, actor, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function searchTaskAssignees(actor: Actor, query: string) {
  const encoded = encodeURIComponent(query.trim());
  return request<{ data: TaskAssigneeOption[]; message: string }>(`/tasks/assignees?query=${encoded}`, actor);
}
