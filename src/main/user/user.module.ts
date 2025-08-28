import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { LikeService } from './service/like.service';
import { CommentService } from './service/comment.service';
import { FollowService } from './service/follow.service';
import { ReportService } from './service/report.service';
import { PostsService } from './service/posts.service';

@Module({
  controllers: [UserController],
  providers: [
    LikeService,
    CommentService,
    FollowService,
    ReportService,
    PostsService,
  ],
})
export class UserModule {}
