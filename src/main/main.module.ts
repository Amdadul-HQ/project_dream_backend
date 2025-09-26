import { Module } from '@nestjs/common';
import { WriterModule } from './writer/writer.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrivateChatModule } from './private-chat/private-chat.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    WriterModule,
    AuthModule,
    UserModule,
    PrivateChatModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
