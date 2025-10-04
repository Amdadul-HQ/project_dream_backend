/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { ENVEnum } from 'src/common/enum/env.enum';
import { PrivateChatService } from '../private-chat.service';
import { SendPrivateMessageDto } from '../dto/privateChatGateway.dto';
import { ConfigService } from '@nestjs/config';
import { PrivateMessage, PrivateMessageStatus } from '@prisma/client';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/private',
  credentials: true,
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

  /** 🔹 Emit new message to specific user */
  emitNewMessage(
    userId: string,
    message: PrivateMessage & {
      file?: any;
      statuses?: PrivateMessageStatus[];
      sender?: { id: string; name: string; profile: string | null };
    },
  ): void {
    this.server.to(userId).emit('private:new_message', message);
  }

  /** 🔹 Authenticate user & join personal room */
  handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    console.log(token, 'token');
    if (!token) return client.disconnect();

    try {
      const jwtSecret = this.configService.get<string>(ENVEnum.JWT_SECRET);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      const userId = payload.sub as string;

      client.data.userId = userId;
      client.join(userId); // Join personal room

      console.log(`User ${userId} connected (socket ${client.id})`);
    } catch (err) {
      client.disconnect();
      console.log(`Authentication failed: ${err.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      console.log(`User ${userId} disconnected (socket ${client.id})`);
    } else {
      console.log(`Socket disconnected: ${client.id}`);
    }
  }

  /** 🔹 Send direct message in real-time */
  @SubscribeMessage('private:send_message')
  async handleMessage(
    @MessageBody()
    payload: {
      recipientId: string;
      dto: SendPrivateMessageDto;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { recipientId, dto } = payload;
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (userId === recipientId) {
      client.emit('error', { message: 'Cannot send message to yourself' });
      return;
    }

    try {
      // Find or create 1:1 conversation
      const conversation =
        await this.privateChatService.findOrCreateConversation(
          userId,
          recipientId,
        );

      const message = await this.privateChatService.sendPrivateMessage(
        conversation.id,
        userId,
        dto,
      );

      // Emit to both sender and recipient
      this.server.to(userId).emit('private:new_message', message);
      this.server.to(recipientId).emit('private:new_message', message);
    } catch (error) {
      client.emit('error', {
        message: 'Failed to send message',
        error: error.message,
      });
    }
  }

  /** 🔹 Load messages (pagination) */
  @SubscribeMessage('private:load_messages')
  async handleLoadMessages(
    @MessageBody()
    payload: { conversationId: string; limit?: number; cursor?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, limit = 20, cursor } = payload;
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      const messages = await this.privateChatService.getConversationMessages(
        conversationId,
        limit,
        cursor,
      );

      client.emit('private:chat_history', {
        conversationId,
        ...messages,
      });

      // Join conversation room for future updates
      client.join(conversationId);
    } catch (error) {
      client.emit('error', {
        message: 'Failed to load messages',
        error: error.message,
      });
    }
  }

  /** 🔹 Load all user conversations */
  @SubscribeMessage('private:load_conversations')
  async handleLoadConversations(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      const conversations =
        await this.privateChatService.getUserConversations(userId);
      client.emit('private:conversations', conversations);
    } catch (error) {
      client.emit('error', {
        message: 'Failed to load conversations',
        error: error.message,
      });
    }
  }

  /** 🔹 Mark messages as read */
  @SubscribeMessage('private:mark_read')
  async handleMarkRead(
    @MessageBody() payload: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId } = payload;
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      await this.privateChatService.markMessagesAsRead(conversationId, userId);

      // Notify other members in the conversation
      this.server.to(conversationId).emit('private:messages_read', {
        conversationId,
        userId,
      });
    } catch (error) {
      client.emit('error', {
        message: 'Failed to mark messages as read',
        error: error.message,
      });
    }
  }

  /** 🔹 Get online status of users */
  @SubscribeMessage('private:get_online_status')
  async handleGetOnlineStatus(
    @MessageBody() payload: { userIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const { userIds } = payload;
    const onlineStatus: Record<string, boolean> = {};

    for (const userId of userIds) {
      const sockets = await this.server.in(userId).fetchSockets();
      onlineStatus[userId] = sockets.length > 0;
    }

    client.emit('private:online_status', onlineStatus);
  }
}
