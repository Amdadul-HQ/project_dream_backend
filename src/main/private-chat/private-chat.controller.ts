import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrivateChatService } from './private-chat.service';
import { SendPrivateMessageDto } from './dto/privateChatGateway.dto';
import { GetUserListDto } from './dto/getUserList.dto';
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

  @Get('users')
  @ApiOperation({
    summary: 'Get user list with pagination and message info',
    description:
      'Returns users ordered by last message time. Users with recent messages appear first.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by user name',
  })
  async getUserList(
    @Query() dto: GetUserListDto,
    @GetUser('userId') userId: string,
  ) {
    // Update current user's last active time
    await this.privateService.updateUserLastActive(userId);

    const result = await this.privateService.getUserListWithMessages(
      userId,
      dto,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get total unread message count',
  })
  async getUnreadCount(@GetUser('userId') userId: string) {
    const count = await this.privateService.getUnreadCount(userId);

    return {
      success: true,
      unreadCount: count,
    };
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all user conversations',
  })
  async getConversations(@GetUser('userId') userId: string) {
    const conversations =
      await this.privateService.getUserConversations(userId);

    return {
      success: true,
      conversations,
    };
  }

  @Get('conversation/:conversationId/messages')
  @ApiOperation({
    summary: 'Get conversation messages with pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of messages to load (default: 20)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor for pagination (message ID)',
  })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const result = await this.privateService.getConversationMessages(
      conversationId,
      limit,
      cursor,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Post('conversation/:conversationId/read')
  @ApiOperation({
    summary: 'Mark all messages in conversation as read',
  })
  async markAsRead(
    @Param('conversationId') conversationId: string,
    @GetUser('userId') userId: string,
  ) {
    await this.privateService.markMessagesAsRead(conversationId, userId);

    return {
      success: true,
      message: 'Messages marked as read',
    };
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
