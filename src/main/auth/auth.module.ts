import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CloudinaryService } from '@project/lib/cloudinary/cloudinary.service';

@Module({
  providers: [AuthService, CloudinaryService],
  controllers: [AuthController],
})
export class AuthModule {}
