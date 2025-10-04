import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { CreatePostService } from './services/post-create.service';

@Module({
  controllers: [PostController],
  providers: [CreatePostService],
})
export class PostModule {}
