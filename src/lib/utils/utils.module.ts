import { Global, Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { JwtService } from '@nestjs/jwt';
import { FileService } from './file.service';

@Global()
@Module({
  providers: [UtilsService, JwtService, FileService],
  exports: [UtilsService],
})
export class UtilsModule {}
