import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const accessToken = this.jwtService.sign(
  { sub: user.id, email: user.email },
);

    return {
      accessToken,
      message: 'User created successfully',
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
  throw new UnauthorizedException('Please use Google to sign in');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);


    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const accessToken = this.jwtService.sign(
  { sub: user.id, email: user.email },
);

    return {
      accessToken,
      message: 'Login successful',
    };
  }

  async findOrCreateGoogleUser(email: string, displayName: string) {
  // Check if user already exists
  let user = await this.prisma.user.findUnique({
    where: { email },
  });

  // If not, create them without a password
  if (!user) {
    user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: undefined,
      },
    });
  }

  // Issue JWT
  const accessToken = this.jwtService.sign({
    sub: user.id,
    email: user.email,
  });

  return { accessToken, email: user.email };
}
}

