import { PrismaClient, Role, LeaveStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const defaultPasswordHash = await hash('Password123!', 10);

  await prisma.leaveRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.department.deleteMany();

  await prisma.department.createMany({
    data: [
      { id: 'dept-sales', name: 'Sales' },
      { id: 'dept-tech', name: 'Technology' },
    ],
  });

  await prisma.team.createMany({
    data: [
      { id: 'team-sales-a', name: 'Sales Team A', departmentId: 'dept-sales' },
      { id: 'team-sales-b', name: 'Sales Team B', departmentId: 'dept-sales' },
      { id: 'team-tech-platform', name: 'Platform Team', departmentId: 'dept-tech' },
    ],
  });

  await prisma.user.createMany({
    data: [
      {
        id: 'admin-001',
        fullName: 'System Admin',
        email: 'admin@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.admin,
      },
      {
        id: 'hr-001',
        fullName: 'HR Executive',
        email: 'hr@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.hr,
      },
      {
        id: 'mgr-sales-001',
        fullName: 'Sales Department Manager',
        email: 'manager.sales@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.manager,
        departmentId: 'dept-sales',
      },
      {
        id: 'lead-sales-a-001',
        fullName: 'Sales Team A Lead',
        email: 'lead.sales.a@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.team_lead,
        departmentId: 'dept-sales',
        teamId: 'team-sales-a',
      },
      {
        id: 'emp-sales-a-001',
        fullName: 'Sales Team A Employee 1',
        email: 'employee.sales.a1@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.employee,
        departmentId: 'dept-sales',
        teamId: 'team-sales-a',
      },
      {
        id: 'emp-sales-a-002',
        fullName: 'Sales Team A Employee 2',
        email: 'employee.sales.a2@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.employee,
        departmentId: 'dept-sales',
        teamId: 'team-sales-a',
      },
      {
        id: 'lead-sales-b-001',
        fullName: 'Sales Team B Lead',
        email: 'lead.sales.b@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.team_lead,
        departmentId: 'dept-sales',
        teamId: 'team-sales-b',
      },
      {
        id: 'emp-sales-b-001',
        fullName: 'Sales Team B Employee 1',
        email: 'employee.sales.b1@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.employee,
        departmentId: 'dept-sales',
        teamId: 'team-sales-b',
      },
      {
        id: 'mgr-tech-001',
        fullName: 'Technology Department Manager',
        email: 'manager.tech@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.manager,
        departmentId: 'dept-tech',
      },
      {
        id: 'lead-tech-platform-001',
        fullName: 'Platform Team Lead',
        email: 'lead.tech.platform@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.team_lead,
        departmentId: 'dept-tech',
        teamId: 'team-tech-platform',
      },
      {
        id: 'emp-tech-platform-001',
        fullName: 'Platform Engineer 1',
        email: 'employee.tech.platform1@hrm.local',
        passwordHash: defaultPasswordHash,
        role: Role.employee,
        departmentId: 'dept-tech',
        teamId: 'team-tech-platform',
      },
    ],
  });

  await prisma.leaveRequest.createMany({
    data: [
      {
        id: 'lr-001',
        employeeId: 'emp-sales-a-001',
        fromDate: new Date('2026-03-24'),
        toDate: new Date('2026-03-25'),
        status: LeaveStatus.pending,
      },
      {
        id: 'lr-002',
        employeeId: 'emp-sales-b-001',
        fromDate: new Date('2026-03-27'),
        toDate: new Date('2026-03-28'),
        status: LeaveStatus.pending,
      },
      {
        id: 'lr-003',
        employeeId: 'emp-tech-platform-001',
        fromDate: new Date('2026-04-01'),
        toDate: new Date('2026-04-02'),
        status: LeaveStatus.approved,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
