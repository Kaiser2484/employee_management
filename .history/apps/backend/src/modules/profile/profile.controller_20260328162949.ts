import { BadRequestException, Body, Controller, Get, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Express } from 'express';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { ProfileService, PublicProfile, PublicUser } from './profile.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  degree?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  employeeStatus?: string;

  @IsOptional()
  @IsString()
  jobCategory?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;
}

class UpdatePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async getProfile(
    @Req() req: Request & { user?: RequestUser },
  ): Promise<{ data: PublicProfile; message: string }> {
    return this.profileService.getProfile(req.user!);
  }

  @Post('update')
  async updateProfile(
    @Req() req: Request & { user?: RequestUser },
    @Body() body: UpdateProfileDto,
  ): Promise<{ user: PublicUser; message: string }> {
    return this.profileService.updateProfile(req.user!, body);
  }

  @Post('password')
  async updatePassword(
    @Req() req: Request & { user?: RequestUser },
    @Body() body: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    return this.profileService.updatePassword(req.user!, body.currentPassword, body.newPassword);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: Request & { user?: RequestUser },
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ url: string; user: PublicUser; message: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const filePath = `/uploads/${file.filename}`;
    return this.profileService.saveAvatarPath(req.user!, filePath);
  }
}
