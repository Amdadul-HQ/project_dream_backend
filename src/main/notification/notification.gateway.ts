/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket, BroadcastOperator } from 'socket.io';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private onlineMap = new Map<string, Set<string>>();

  constructor(private readonly notificationService: NotificationService) {}

  handleConnection(client: Socket) {
    const userId =
      (client.handshake.auth && (client.handshake.auth.userId as string)) ||
      (client.handshake.query.userId as string);

    if (!userId) return;

    client.data.userId = userId;

    if (!this.onlineMap.has(userId)) this.onlineMap.set(userId, new Set());
    this.onlineMap.get(userId)!.add(client.id);

    client.join(this.userRoom(userId));
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string;
    if (!userId) return;

    const set = this.onlineMap.get(userId);
    if (!set) return;

    set.delete(client.id);
    if (set.size === 0) this.onlineMap.delete(userId);
  }

  private userRoom(userId: string): string {
    return `user_${userId}`;
  }

  /**
   * Push notification to a specific user
   */
  pushNotificationToUser(userId: string, payload: unknown) {
    const room: BroadcastOperator<any, any> = this.server.to(
      this.userRoom(userId),
    );
    room.emit('notification:created', payload);
  }

  @SubscribeMessage('notification:markAllRead')
  async onMarkAllRead(client: Socket) {
    const userId = client.data.userId as string;
    if (!userId) return;

    // Await async service
    await this.notificationService.markAllRead(userId);

    // Emit synchronous event to all sockets in user room
    const room: BroadcastOperator<any, any> = this.server.to(
      this.userRoom(userId),
    );
    room.emit('notification:markAllRead:done', { success: true });
  }
}
