import { Module } from '@nestjs/common';
import { FollowService } from './services/user-follower.service';
import { FollowController } from './controller/user-follow.controller';
import { CommentController } from './controller/post-comment.controller';
import { CommentService } from './services/user-post-comment.service';
import { PostLikeController } from './controller/post-like.controller';
import { PostLikeService } from './services/user-post-like.service';

@Module({
  controllers: [FollowController, CommentController, PostLikeController],
  providers: [FollowService, CommentService, PostLikeService],
})
export class UserModule {}
