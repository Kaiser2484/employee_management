import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { Public } from './decorators/public.decorator';
import { RequestUser } from './interfaces/request-user.interface';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class RegisterDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.fullName, body.email, body.password);
  }

  @Get('me')
  me(@Req() req: Request & { user?: RequestUser }) {
    return {
      user: req.user,
    };
  }
}
