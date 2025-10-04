import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { RegisterUserDto } from './dto/auth.dto';
import { LoginDto } from './dto/login.dto';
import { UtilsService } from 'src/lib/utils/utils.service';
import { successResponse } from 'src/common/utils/response.util';
import { google, oauth2_v2 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libUtils: UtilsService,
    private readonly oauth2Client: OAuth2Client,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  /**
   * 🔹 Register user with email/password + social links
   */
  async register(dto: RegisterUserDto, file: string | null) {
    try {
      if (!file) {
        throw new BadRequestException('Profile image is required');
      }

      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new BadRequestException('User already exists');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            profile: file,
            role: Role.USER,
            isGoogle: false,
            isVerified: false,
          },
        });

        await tx.auth.create({
          data: {
            email: user.email,
            name: user.name,
            password: hashedPassword,
            role: Role.USER,
            userId: user.id,
          },
        });

        // Create social media links if provided
        const socialLinks = {
          facebook: dto.facebook,
          youtube: dto.youtube,
          twitter: dto.twitter,
          instagram: dto.instagram,
          pinterest: dto.pinterest,
          linkedin: dto.linkedin,
          tiktok: dto.tiktok,
        };

        if (Object.values(socialLinks).some(Boolean)) {
          await tx.userSocialMedia.create({
            data: {
              userId: user.id,
              ...socialLinks,
            },
          });
        }

        // Initialize user stats
        await tx.userStats.create({
          data: {
            userId: user.id,
          },
        });

        const token = this.libUtils.generateToken({
          email: user.email,
          roles: user.role,
          sub: user.id,
        });

        return successResponse({ user, token }, 'User registered successfully');
      });
    } catch (err) {
      console.error('REGISTER ERROR:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Internal server error during registration',
      );
    }
  }

  /**
   * 🔹 Standard email/password login
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        socialMedia: true,
        userStats: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    if (user.status !== 'Active') {
      throw new UnauthorizedException(
        `Account is ${user.status.toLowerCase()}`,
      );
    }

    const credentials = await this.prisma.auth.findUnique({
      where: { userId: user.id },
    });

    if (!credentials?.password) {
      throw new NotFoundException('Credentials not found for this user');
    }

    // Check if this is a Google OAuth user
    if (user.isGoogle && credentials.password === 'GOOGLE_OAUTH_USER') {
      throw new BadRequestException(
        'This account uses Google Sign-In. Please login with Google.',
      );
    }

    const isPasswordMatch = await this.libUtils.comparePassword({
      password,
      hashedPassword: credentials.password,
    });

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    // Update last active timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const token = this.libUtils.generateToken({
      email: user.email,
      roles: user.role,
      sub: user.id,
    });

    return successResponse({ user, token }, 'Login successful');
  }

  /**
   * 🔹 Generate Google OAuth URL
   */
  getGoogleAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    return url;
  }

  /**
   * 🔹 Handle Google OAuth Callback
   */
  async handleGoogleCallback(code: string) {
    try {
      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Get user profile
      const oauth2 = google.oauth2({
        version: 'v2',
        auth: this.oauth2Client,
      });
      const { data: profile } = await oauth2.userinfo.get();

      if (!profile?.email) {
        throw new BadRequestException('Google profile does not contain email');
      }

      // Check if user exists
      let user = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include: {
          socialMedia: true,
          userStats: true,
        },
      });

      if (user) {
        // Existing user - check if account is active
        if (user.status !== 'Active') {
          throw new UnauthorizedException(
            `Account is ${user.status.toLowerCase()}`,
          );
        }

        // Update last active
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            lastActiveAt: new Date(),
            // Update profile picture if not set
            profile: user.profile || profile.picture || null,
          },
        });
      } else {
        // Create new user with Google OAuth
        user = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: profile.name || 'Google User',
              email: profile.email!,
              profile: profile.picture || null,
              role: Role.USER,
              isGoogle: true,
              isVerified: true, // Google accounts are pre-verified
              phone: null,
              address: null,
            },
            include: {
              socialMedia: true,
              userStats: true,
            },
          });

          // Create auth record with placeholder password
          await tx.auth.create({
            data: {
              email: newUser.email,
              name: newUser.name,
              password: 'GOOGLE_OAUTH_USER',
              role: Role.USER,
              userId: newUser.id,
            },
          });

          // Initialize user stats
          await tx.userStats.create({
            data: {
              userId: newUser.id,
            },
          });

          return newUser;
        });

        console.log('✅ Created new Google user:', user.email);
      }

      // Generate JWT token
      const token = this.libUtils.generateToken({
        email: user.email,
        roles: user.role,
        sub: user.id,
      });

      return successResponse(
        { user, token },
        user.isGoogle
          ? 'Google login successful'
          : 'Account linked with Google',
      );
    } catch (error) {
      console.error('❌ Google OAuth Error:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to authenticate with Google',
      );
    }
  }

  /**
   * 🔹 Legacy Google Login (for backward compatibility)
   */
  async googleLogin(profile: oauth2_v2.Schema$Userinfo) {
    try {
      if (!profile?.email) {
        throw new BadRequestException('Google profile does not contain email');
      }

      let user = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include: {
          socialMedia: true,
          userStats: true,
        },
      });

      if (!user) {
        user = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: profile.name || 'Google User',
              email: profile.email!,
              profile: profile.picture || null,
              role: Role.USER,
              isGoogle: true,
              isVerified: true,
              phone: null,
              address: null,
            },
            include: {
              socialMedia: true,
              userStats: true,
            },
          });

          await tx.auth.create({
            data: {
              email: newUser.email,
              name: newUser.name,
              password: 'GOOGLE_OAUTH_USER',
              role: Role.USER,
              userId: newUser.id,
            },
          });

          await tx.userStats.create({
            data: {
              userId: newUser.id,
            },
          });

          return newUser;
        });
      }

      const token = this.libUtils.generateToken({
        email: user.email,
        roles: user.role,
        sub: user.id,
      });

      return successResponse({ user, token }, 'Google login successful');
    } catch (error) {
      console.error('❌ Error in googleLogin:', error);
      throw new InternalServerErrorException('Google login failed');
    }
  }
}
