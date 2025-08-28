import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Module({
  providers: [CloudinaryService, PrismaService],
})
export class CloudinaryModule {}
