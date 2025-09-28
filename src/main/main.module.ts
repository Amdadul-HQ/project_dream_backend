import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrivateChatModule } from './private-chat/private-chat.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [AuthModule, PrivateChatModule, NotificationModule],
  controllers: [],
  providers: [],
})
export class MainModule {}
