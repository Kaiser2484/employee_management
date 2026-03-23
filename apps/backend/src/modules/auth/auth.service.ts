import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { Role, User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

    const user = await this.prisma.user.create({
      data: {
        id: `usr-${randomUUID().slice(0, 8)}`,
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

  private toPublicUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };
  }
}
