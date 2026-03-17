import { Body, Controller, Get, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  healthCheck() {
    return { message: 'Auth service is running', status: 'ok' };
  }

  @Post('register')
  register(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Request() req: any) {
    return {
      userId: req.user.userId,
      email: req.user.email,
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport handles the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req: any, @Res() res: Response) {
    const { accessToken } = req.user;
    // Redirect to frontend with token in query param
    res.redirect(`http://localhost:3001/auth/callback?token=${accessToken}`);
  }
}