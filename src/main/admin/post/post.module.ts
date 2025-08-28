import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { AllPostService } from './service/all-post.service';
import { ReportService } from './service/report.service';

@Module({
  controllers: [PostController],
  providers: [AllPostService, ReportService],
})
export class PostModule {}
