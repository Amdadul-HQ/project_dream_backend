import { Module } from '@nestjs/common';
import { PrivateChatService } from './private-chat.service';
import { PrivateChatController } from './private-chat.controller';
import { PrivateChatGateway } from './privateChatGateway/privateChatGateway';
import { FileService } from 'src/lib/utils/file.service';

@Module({
  controllers: [PrivateChatController],
  providers: [PrivateChatService, PrivateChatGateway, FileService],
})
export class PrivateChatModule {}
