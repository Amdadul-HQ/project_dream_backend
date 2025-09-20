/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  Inject,
  forwardRef,
  OnModuleInit,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrivateChatService } from './private-chat.service';
import { SendPrivateMessageDto } from './dto/privateChatGateway.dto';
import { sendPrivateMessageSwaggerSchema } from './dto/privateChatGateway.swagger';
import { GetUser, ValidateAuth } from 'src/common/jwt/jwt.decorator';
import { PrivateChatGateway } from './privateChatGateway/privateChatGateway';

@ApiTags('Private Chat')
@Controller('private-chat')
@ValidateAuth()
@ApiBearerAuth()
export class PrivateChatController implements OnModuleInit {
  private gateway: PrivateChatGateway;

  constructor(
    private readonly privateService: PrivateChatService,
    @Inject(forwardRef(() => PrivateChatGateway))
    private readonly injectedGateway: PrivateChatGateway,
  ) {}

  onModuleInit() {
    this.gateway = this.injectedGateway;
  }

  @Post('send-message/:recipientId')
  @ApiOperation({ summary: 'Send private message' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: sendPrivateMessageSwaggerSchema.properties,
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async sendTeamMessage(
    @Param('recipientId') recipientId: string,
    @Body() dto: SendPrivateMessageDto,
    @UploadedFile() file: Express.Multer.File,
    @GetUser('userId') senderId: string,
  ) {
    if (recipientId === senderId)
      throw new Error('Cannot send message to yourself');

    const conversation = await this.privateService.findOrCreateConversation(
      senderId,
      recipientId,
    );
    const message = await this.privateService.sendPrivateMessage(
      conversation.id,
      senderId,
      dto,
      // file,
    );

    // Emit to both sender & recipient
    [senderId, recipientId].forEach((id) =>
      this.gateway.emitNewMessage(id, message),
    );

    return { success: true, message };
  }
}
