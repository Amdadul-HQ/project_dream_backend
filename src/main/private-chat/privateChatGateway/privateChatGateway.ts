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
import { ENVEnum } from '@project/common/enum/env.enum';
import { PrivateChatService } from '../private-chat.service';
import { SendPrivateMessageDto } from '../dto/privateChatGateway.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
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

  async handleConnection(client: Socket) {
    const token = client.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      client.disconnect();
      console.log('Missing token');
      return;
    }

    try {
      const jwtSecret = this.configService.get<string>(ENVEnum.JWT_SECRET);
      const payload: any = jwt.verify(token, jwtSecret as string);
      const userId = payload.sub;

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
    console.log(payload, 'payload');
    // Validate sender matches token
    if (client.data.userId !== userId) {
      console.log(client, 'client');
      console.log(
        `User ID mismatch: client ${client.data.userId} vs payload ${userId}`,
      );
      return;
    }

    // Prevent sending to self
    if (userId === recipientId) {
      console.log('hello');
      console.log(`User ${userId} cannot send message to themselves`);
      return;
    }

    // Get or create conversation
    const conversation = await this.privateChatService.findOrCreateConversation(
      userId,
      recipientId,
    );

    // Send message
    const message = await this.privateChatService.sendPrivateMessage(
      conversation.id,
      userId,
      dto,
      file,
    );

    // Emit to both users
    this.server.to(userId).emit('private:new_message', message);
    console.log(message, '<=message', recipientId, '<=reciver id');
    this.server.to(recipientId).emit('private:new_message', message);
  }

  emitNewMessage(userId: string, message: any) {
    this.server.to(userId).emit('private:new_message', message);
  }
}
