import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RequestUser } from '../auth/interfaces/request-user.interface';

interface UpdateProfileInput {
  fullName?: string;
  email?: string | null;
  avatarUrl?: string | null;
  degree?: string;
  gender?: string;
  dateOfBirth?: string;
  startDate?: string;
  nationalId?: string;
  address?: string;
  employeeStatus?: string;
  jobCategory?: string;
  jobTitle?: string;
  departmentId?: string;
  teamId?: string;
}

export interface PublicUser {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  avatarUrl: string | null;
}

export interface PublicProfile extends PublicUser {
  degree: string;
  departmentId: string | null;
  teamId: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  startDate: string | null;
  nationalId: string | null;
  address: string | null;
  employeeStatus: string | null;
  jobCategory: string | null;
  jobTitle: string | null;
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

  private toProfile(user: {
    id: string;
    fullName: string;
    email: string | null;
    role: string;
    photoUrl: string | null;
    degree: string;
    departmentId: string | null;
    teamId: string | null;
    gender: string | null;
    dateOfBirth: Date | null;
    startDate: Date | null;
    nationalId: string | null;
    address: string | null;
    employeeStatus: string | null;
    jobCategory: string | null;
    jobTitle: string | null;
  }): PublicProfile {
    return {
      ...this.toPublic(user),
      degree: user.degree,
      departmentId: user.departmentId,
      teamId: user.teamId,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
      startDate: user.startDate ? user.startDate.toISOString().slice(0, 10) : null,
      nationalId: user.nationalId,
      address: user.address,
      employeeStatus: user.employeeStatus,
      jobCategory: user.jobCategory,
      jobTitle: user.jobTitle,
    };
  }

  async getProfile(actor: RequestUser): Promise<{ data: PublicProfile; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        photoUrl: true,
        degree: true,
        departmentId: true,
        teamId: true,
        gender: true,
        dateOfBirth: true,
        startDate: true,
        nationalId: true,
        address: true,
        employeeStatus: true,
        jobCategory: true,
        jobTitle: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      data: this.toProfile(user),
      message: 'Profile loaded',
    };
  }

  private normalizeOptional(value: string | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  async updateProfile(actor: RequestUser, payload: UpdateProfileInput) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const email = payload.email === undefined ? user.email : (payload.email?.trim().toLowerCase() || null);
    const fullName = payload.fullName?.trim() || user.fullName;
    const avatarUrl = payload.avatarUrl === undefined ? user.photoUrl : payload.avatarUrl;

    const degree = payload.degree === undefined ? user.degree : payload.degree.trim();
    const departmentId = this.normalizeOptional(payload.departmentId);
    const teamId = this.normalizeOptional(payload.teamId);
    const gender = this.normalizeOptional(payload.gender);
    const dateOfBirth = payload.dateOfBirth === undefined
      ? undefined
      : (payload.dateOfBirth ? new Date(payload.dateOfBirth) : null);
    const startDate = payload.startDate === undefined
      ? undefined
      : (payload.startDate ? new Date(payload.startDate) : null);
    const nationalId = this.normalizeOptional(payload.nationalId);
    const address = this.normalizeOptional(payload.address);
    const employeeStatus = this.normalizeOptional(payload.employeeStatus);
    const jobCategory = this.normalizeOptional(payload.jobCategory);
    const jobTitle = this.normalizeOptional(payload.jobTitle);

    try {
      const updated = await this.prisma.user.update({
        where: { id: actor.id },
        data: {
          fullName,
          email,
          photoUrl: avatarUrl,
          degree,
          departmentId,
          teamId,
          gender,
          dateOfBirth,
          startDate,
          nationalId,
          address,
          employeeStatus,
          jobCategory,
          jobTitle,
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
