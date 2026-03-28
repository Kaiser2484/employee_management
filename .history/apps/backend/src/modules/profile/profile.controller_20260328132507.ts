import { Body, Controller, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Express } from 'express';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { ProfileService, PublicUser } from './profile.service';

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
      return { message: 'No file uploaded' };
    }
    const filePath = `/uploads/${file.filename}`;
    return this.profileService.saveAvatarPath(req.user!, filePath);
  }
}
