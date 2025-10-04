import { Module } from '@nestjs/common';
import { PrivateChatService } from './private-chat.service';
import { PrivateChatController } from './private-chat.controller';
import { PrivateChatGateway } from './privateChatGateway/privateChatGateway';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationService } from '../notification/notification.service';

@Module({
  controllers: [PrivateChatController],
  providers: [
    PrivateChatService,
    PrivateChatGateway,
    NotificationGateway,
    NotificationService,
  ],
})
export class PrivateChatModule {}
