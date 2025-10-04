import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrivateChatModule } from './private-chat/private-chat.module';
import { NotificationModule } from './notification/notification.module';
import { PostModule } from './post/post.module';
import { PostCategoryModule } from './admin/post-category/post-category.module';

@Module({
  imports: [
    AuthModule,
    PrivateChatModule,
    NotificationModule,
    PostModule,
    PostCategoryModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
