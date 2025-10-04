import { Module } from '@nestjs/common';
import { PostCategoryController } from './post-category.controller';
import { PostCategoryService } from './services/post-category-create.service';

@Module({
  controllers: [PostCategoryController],
  providers: [PostCategoryService],
})
export class PostCategoryModule {}
