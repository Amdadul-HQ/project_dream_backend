import { Module } from '@nestjs/common';
import { FollowService } from './services/user-follower.service';
import { FollowController } from './controller/user-follow.controller';
import { CommentController } from './controller/post-comment.controller';
import { CommentService } from './services/user-post-comment.service';
import { PostLikeController } from './controller/post-like.controller';
import { PostLikeService } from './services/user-post-like.service';
import { ReportController } from './controller/post-report.controller';
import { ReportService } from './services/user-post-report.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationService } from '../notification/notification.service';

@Module({
  controllers: [
    FollowController,
    CommentController,
    PostLikeController,
    ReportController,
  ],
  providers: [
    FollowService,
    CommentService,
    PostLikeService,
    ReportService,
    NotificationGateway,
    NotificationService,
  ],
})
export class UserModule {}
