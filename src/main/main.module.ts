import { Module } from '@nestjs/common';
import { WriterModule } from './writer/writer.module';
import { AuthModule } from './auth/auth.module';
import { PostCategoryModule } from './admin/post-category/post-category.module';
import { PostModule } from './admin/post/post.module';
import { UserModule } from './user/user.module';
import { DashboardModule } from './admin/dashboard/dashboard.module';
import { PrivateChatModule } from './private-chat/private-chat.module';
import { NotificationModule } from './notification/notification.module';
import { NotificationModule } from './notification/notification.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    WriterModule,
    AuthModule,
    PostCategoryModule,
    PostModule,
    UserModule,
    DashboardModule,
    PrivateChatModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
