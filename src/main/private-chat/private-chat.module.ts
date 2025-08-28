import { Module } from '@nestjs/common';
import { PrivateChatService } from './private-chat.service';
import { PrivateChatController } from './private-chat.controller';
import { PrivateChatGateway } from './privateChatGateway/privateChatGateway';

@Module({
  controllers: [PrivateChatController],
  providers: [PrivateChatService, PrivateChatGateway],
})
export class PrivateChatModule {}
