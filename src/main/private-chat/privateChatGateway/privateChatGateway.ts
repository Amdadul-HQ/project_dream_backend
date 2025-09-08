/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { ENVEnum } from 'src/common/enum/env.enum';
import { PrivateChatService } from '../private-chat.service';
import { SendPrivateMessageDto } from '../dto/privateChatGateway.dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/private',
})
export class PrivateChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly privateChatService: PrivateChatService,
    private readonly configService: ConfigService,
  ) {}

  /** 🔹 Authenticate & join user room */
  handleConnection(client: Socket) {
    const token = client.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      client.disconnect();
      console.log('Missing token');
      return;
    }

    try {
      const jwtSecret = this.configService.get<string>(ENVEnum.JWT_SECRET);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const payload = jwt.verify(token, jwtSecret as string) as jwt.JwtPayload;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const userId = payload.sub;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      client.data.userId = userId;
      client.join(userId);

      console.log(
        `Private chat: User ${userId} connected, socket ${client.id}`,
      );
    } catch (err) {
      client.disconnect();
      console.log(`Authentication failed: ${err.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Private chat disconnected: ${client.id}`);
  }

  /** 🔹 Send message */
  @SubscribeMessage('private:send_message')
  async handleMessage(
    @MessageBody()
    payload: {
      recipientId: string;
      dto: SendPrivateMessageDto;
      file?: Express.Multer.File;
      userId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { recipientId, dto, file, userId } = payload;

    // Validate sender matches token
    if (client.data.userId !== userId) {
      console.log(
        `User ID mismatch: client ${client.data.userId} vs payload ${userId}`,
      );
      return;
    }

    // Prevent sending to self
    if (userId === recipientId) {
      console.log(`User ${userId} cannot send message to themselves`);
      return;
    }

    // Get or create conversation
    const conversation = await this.privateChatService.findOrCreateConversation(
      userId,
      recipientId,
    );

    // Save message
    const message = await this.privateChatService.sendPrivateMessage(
      conversation.id,
      userId,
      dto,
      file,
    );

    // Emit to sender & recipient
    this.server.to(userId).emit('private:new_message', message);
    this.server.to(recipientId).emit('private:new_message', message);
  }

  /** 🔹 Load messages (chat history with pagination) */
  @SubscribeMessage('private:load_messages')
  async handleLoadMessages(
    @MessageBody()
    payload: { conversationId: string; limit?: number; cursor?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, limit = 20, cursor } = payload;

    const messages = await this.privateChatService.getConversationMessages(
      conversationId,
      limit,
      cursor,
    );

    client.emit('private:chat_history', {
      conversationId,
      ...messages,
    });
  }

  /** 🔹 Load user conversations */
  @SubscribeMessage('private:load_conversations')
  async handleLoadConversations(
    @MessageBody() payload: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = payload;

    if (client.data.userId !== userId) {
      console.log(
        `User ID mismatch: client ${client.data.userId} vs payload ${userId}`,
      );
      return;
    }

    const conversations =
      await this.privateChatService.getUserConversations(userId);

    client.emit('private:conversations', conversations);
  }

  /** 🔹 Mark messages as read */
  @SubscribeMessage('private:mark_read')
  async handleMarkRead(
    @MessageBody()
    payload: { conversationId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, userId } = payload;

    if (client.data.userId !== userId) {
      console.log(
        `User ID mismatch: client ${client.data.userId} vs payload ${userId}`,
      );
      return;
    }

    await this.privateChatService.markMessagesAsRead(conversationId, userId);

    // Notify conversation participants
    this.server.to(conversationId).emit('private:messages_read', {
      conversationId,
      userId,
    });
  }

  /** 🔹 Utility: Emit new message manually */
  emitNewMessage(userId: string, message: any) {
    this.server.to(userId).emit('private:new_message', message);
  }
}
