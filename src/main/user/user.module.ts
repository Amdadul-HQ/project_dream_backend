import { Module } from '@nestjs/common';
import { FollowService } from './services/user-follower.service';
import { FollowController } from './controller/user-follow.controller';

@Module({
  controllers: [FollowController],
  providers: [FollowService],
})
export class UserModule {}
