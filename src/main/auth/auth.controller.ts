/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { registerUserSwaggerSchema } from './dto/registration.swagger';
import { RegisterUserDto } from './dto/auth.dto';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/googleLogin.dto';

@ApiTags('Auth ---')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // user Registration
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
    let uploadedUrl: any = null;

    if (file) {
      uploadedUrl = await this.cloudinaryService.uploadImageFromBuffer(
        file.buffer,
        file.originalname,
      );
    }
    return await this.authService.register(
      registerUserDto,
      uploadedUrl?.url || null,
    );
  }

  // User login
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  // Google Login
  @Post('google/login')
  async handleGoogleCode(@Body() code: GoogleLoginDto) {
    const { profile } = await this.authService.exchangeCodeForTokens(code.code);

    const user = {
      userName: `@${profile.name?.toLowerCase()}`,
      email: profile.email,
      name: profile.name?.split(' ').join(''),
      images: profile.picture,
      role: 'USER',
      password: '',
    };
    return await this.authService.googleLogin(user);
  }
}
