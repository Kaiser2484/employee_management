import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RequestUser } from './interfaces/request-user.interface';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateNextEmployeeCode() {
    const latest = await this.prisma.user.findFirst({
      where: { id: { startsWith: 'NV' } },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    let nextNumber = 1;
    if (latest?.id) {
      const match = /^NV(\d{6})$/.exec(latest.id);
      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    // Retry if there is a gap/collision from concurrent creation.
    while (true) {
      const candidate = `NV${String(nextNumber).padStart(6, '0')}`;
      const exists = await this.prisma.user.findUnique({
        where: { id: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      nextNumber += 1;
    }
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await compare(password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      user: this.toPublicUser(user),
      message: 'Login successful',
    };
  }

  async register(fullName: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hash(password, 10);
    const employeeCode = await this.generateNextEmployeeCode();

    const user = await this.prisma.user.create({
      data: {
        id: employeeCode,
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: Role.employee,
      },
    });

    return {
      user: this.toPublicUser(user),
      message: 'Registration successful',
    };
  }

  async me(actor: RequestUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
    });

    if (!user) {
      throw new UnauthorizedException('Session is no longer valid. Please login again.');
    }

    if (user.role !== actor.role) {
      throw new UnauthorizedException('Role changed. Please login again.');
    }

    return {
      user: this.toPublicUser(user),
      message: 'Session valid',
    };
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.photoUrl,
    };
  }
}
