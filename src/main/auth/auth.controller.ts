import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { registerUserSwaggerSchema } from './dto/registration.swagger';
import { RegisterUserDto } from './dto/auth.dto';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/googleLogin.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * 🔹 User Registration with profile upload
   */
  @Post('registration')
  @ApiOperation({ summary: 'User Registration' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ...registerUserSwaggerSchema.properties,
        profile: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('profile'))
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let uploadedUrl: { secure_url: string } | null = null;

    if (file) {
      uploadedUrl = await this.cloudinaryService.uploadImageFromBuffer(
        file.buffer,
        file.originalname,
      );
    }
    return await this.authService.register(
      registerUserDto,
      uploadedUrl ? uploadedUrl.secure_url : null,
    );
  }

  /**
   * 🔹 Standard Email/Password Login
   */
  @Post('login')
  @ApiOperation({ summary: 'User Login' })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  /**
   * 🔹 Get Google OAuth URL - Initiates OAuth flow
   */
  @Get('google/url')
  @ApiOperation({ summary: 'Get Google OAuth URL' })
  getGoogleAuthUrl() {
    const url = this.authService.getGoogleAuthUrl();
    return {
      success: true,
      data: { url },
      message: 'Google OAuth URL generated',
    };
  }

  /**
   * 🔹 Google OAuth Callback - Exchange code for user data
   */
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth Callback' })
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    try {
      const result = await this.authService.handleGoogleCallback(code);

      // Redirect to frontend with token
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/google/success?token=${result.data.token}`,
      );
    } catch (error) {
      console.error('Google callback error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
      );
    }
  }

  /**
   * 🔹 Google Login with Authorization Code (Alternative method)
   */
  @Post('google/login')
  @ApiOperation({ summary: 'Google Login with Code' })
  async handleGoogleCode(@Body() googleLoginDto: GoogleLoginDto) {
    return await this.authService.handleGoogleCallback(googleLoginDto.code);
  }
}
