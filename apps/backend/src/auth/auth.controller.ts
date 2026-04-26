import { Body, Controller, Get, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';

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
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Passport handles the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req: any, @Res() res: Response) {
    const { accessToken } = req.user;
    let redirectTarget = 'http://localhost:3001/auth/callback';

    try {
      const stateRaw = typeof req.query?.state === 'string' ? req.query.state : '';
      if (stateRaw) {
        const parsed = JSON.parse(
          Buffer.from(stateRaw, 'base64url').toString('utf8'),
        ) as { redirectUri?: string };
        const candidate = typeof parsed.redirectUri === 'string' ? parsed.redirectUri : '';

        if (
          candidate.startsWith('http://localhost:3001/') ||
          /^https:\/\/[a-z0-9]{32}\.chromiumapp\.org\//.test(candidate)
        ) {
          redirectTarget = candidate;
        }
      }
    } catch {
      // Ignore malformed state and fall back to web callback.
    }

    const separator = redirectTarget.includes('?') ? '&' : '?';
    res.redirect(`${redirectTarget}${separator}token=${encodeURIComponent(accessToken)}`);
  }
}