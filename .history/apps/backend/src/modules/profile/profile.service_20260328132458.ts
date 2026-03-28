import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';

interface UpdateProfileInput {
  fullName?: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface PublicUser {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  avatarUrl: string | null;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublic(user: { id: string; fullName: string; email: string | null; role: string; photoUrl: string | null }): PublicUser {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.photoUrl,
    };
  }

  async updateProfile(actor: RequestUser, payload: UpdateProfileInput) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const email = payload.email?.trim().toLowerCase() ?? user.email;
    const fullName = payload.fullName?.trim() || user.fullName;
    const avatarUrl = payload.avatarUrl === undefined ? user.photoUrl : payload.avatarUrl;

    try {
      const updated = await this.prisma.user.update({
        where: { id: actor.id },
        data: {
          fullName,
          email,
          photoUrl: avatarUrl,
        },
      });

      return {
        user: this.toPublic(updated),
        message: 'Profile updated',
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  async updatePassword(actor: RequestUser, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found or password not set');
    }

    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: actor.id },
      data: { passwordHash: newHash },
    });

    return { message: 'Password updated' };
  }

  async saveAvatarPath(actor: RequestUser, filePath: string) {
    const updated = await this.prisma.user.update({
      where: { id: actor.id },
      data: { photoUrl: filePath },
    });

    return {
      url: filePath,
      user: this.toPublic(updated),
      message: 'Avatar uploaded',
    };
  }
}
