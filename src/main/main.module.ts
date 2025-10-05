import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrivateChatModule } from './private-chat/private-chat.module';
import { NotificationModule } from './notification/notification.module';
import { PostModule } from './post/post.module';
import { PostCategoryModule } from './admin/post-category/post-category.module';
import { UserModule } from './user/user.module';
import { UserManagementModule } from './admin/user-management/user-management.module';
import { PostManagementModule } from './admin/post-management/post-management.module';
import { UserStatesModule } from './admin/user-states/user-states.module';
import { PostStatesModule } from './admin/post-states/post-states.module';

@Module({
  imports: [
    AuthModule,
    PrivateChatModule,
    NotificationModule,
    PostModule,
    PostCategoryModule,
    UserModule,
    UserManagementModule,
    PostManagementModule,
    UserStatesModule,
    PostStatesModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
