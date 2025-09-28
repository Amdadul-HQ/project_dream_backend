// src/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { RegisterUserDto } from './dto/auth.dto';
import { LoginDto } from './dto/login.dto';
import { UtilsService } from 'src/lib/utils/utils.service';
import { successResponse } from 'src/common/utils/response.util';
import { google, oauth2_v2 } from 'googleapis';
import { Credentials } from 'google-auth-library';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libUtils: UtilsService,
  ) {}

  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ||
      'https://developers.google.com/oauthplayground',
  );

  /**
   * 🔹 Register user with email/password + social links
   */
  async register(dto: RegisterUserDto, file: string | null) {
    console.log(dto);
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
            lastActiveAt: new Date(),
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

        return successResponse(user, 'User registered successfully');
      });
    } catch (err) {
      console.error('REGISTER ERROR:', err);
      if (err instanceof BadRequestException) throw err;
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

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    const credentials = await this.prisma.auth.findUnique({
      where: { userId: user.id },
    });
    if (!credentials?.password) {
      throw new NotFoundException('Credentials not found for this user');
    }

    const isPasswordMatch = await this.libUtils.comparePassword({
      password,
      hashedPassword: credentials.password,
    });

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Password does not match');
    }

    const token = this.libUtils.generateToken({
      email: user.email,
      roles: user.role,
      sub: user.id,
    });

    return successResponse({ user, token }, 'Login successful');
  }

  /**
   * 🔹 Google OAuth: Exchange code for tokens + profile
   */
  async exchangeCodeForTokens(code: string): Promise<{
    tokens: Credentials;
    profile: oauth2_v2.Schema$Userinfo;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();

    return { tokens, profile: data };
  }

  /**
   * 🔹 Google OAuth Login
   */
  async googleLogin(profile: oauth2_v2.Schema$Userinfo) {
    try {
      console.log('🔍 googleLogin input profile:', profile);

      if (!profile?.email) {
        throw new BadRequestException('Google profile does not contain email');
      }

      let user: User | null = await this.prisma.user.findFirst({
        where: { email: profile.email },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            name: profile.name || 'No Name',
            address: 'Unknown',
            phone: 'Unknown',
            email: profile.email,
            profile: profile.picture || null,
            role: Role.USER,
          },
        });

        await this.prisma.auth.create({
          data: {
            email: user.email,
            name: user.name,
            // Google users authenticate via OAuth, store a placeholder password
            password: 'GOOGLE_OAUTH_USER',
            role: Role.USER,
            userId: user.id,
          },
        });

        console.log('✅ Created new Google user:', user);
      } else {
        console.log('ℹ️ Existing user found for Google login:', user);
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
