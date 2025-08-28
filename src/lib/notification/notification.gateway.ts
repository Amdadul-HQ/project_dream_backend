import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ENVEnum } from '@project/common/enum/env.enum';
import { UserTokenPayload } from '@project/common/jwt/jwt.interface';
import { IncomingMessage } from 'http';
import { Server, WebSocket } from 'ws';

@WebSocketGateway({
  path: '/notification',
  cors: { origin: '*' },
})
@Injectable()
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);
  private readonly clients = new Map<string, Set<WebSocket>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.log('WebSocket server initialized');

    server.on('error', (err: any) => {
      this.logger.error(`WebSocket server error: ${err.message}`);
    });
  }

  handleConnection(client: WebSocket, ...args: any[]) {
    const req = args[0] as IncomingMessage;
    const authHeader = req.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.warn('Missing or invalid Authorization header');
      return client.close();
    }

    const token = authHeader.split(' ')[1];
    try {
      // Verify token and cast to your JWT payload interface
      const payload = this.jwtService.verify<UserTokenPayload>(token, {
        secret: this.configService.getOrThrow(ENVEnum.JWT_SECRET),
      });

      // Attach decoded user to the socket
      (client as any).user = payload;

      this.subscribeClient(payload.userId, client);
      this.logger.log(`Client connected: ${payload.userId}`);

      client.on('close', () => this.handleDisconnect(client));
    } catch (err: any) {
      this.logger.warn(`JWT verification failed: ${err.message || err}`);
      return client.close();
    }
  }

  handleDisconnect(client: WebSocket) {
    const user: UserTokenPayload | undefined = (client as any).user;
    if (user?.userId) {
      this.unsubscribeClient(user.userId, client);
      this.logger.log(`Client disconnected: ${user.userId}`);
    } else {
      this.logger.log('Client disconnected: unknown user');
    }
  }

  private subscribeClient(userId: string, client: WebSocket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(client);
    this.logger.debug(`Subscribed client to user ${userId}`);
  }

  private unsubscribeClient(userId: string, client: WebSocket) {
    const set = this.clients.get(userId);
    if (!set) return;

    set.delete(client);
    this.logger.debug(`Unsubscribed client from user ${userId}`);
    if (set.size === 0) {
      this.clients.delete(userId);
      this.logger.debug(`Removed empty client set for user ${userId}`);
    }
  }

  public getClientsForUser(userId: string): Set<WebSocket> {
    return this.clients.get(userId) || new Set();
  }
}
