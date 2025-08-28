import { Module } from '@nestjs/common';
import { PostCategoryController } from './post-category.controller';
import { PostCategoryService } from './service/post-category.service';

@Module({
  controllers: [PostCategoryController],
  providers: [PostCategoryService]
})
export class PostCategoryModule {}
