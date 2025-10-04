// src/main/notification/notification.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Req,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { GetUser, ValidateAuth } from 'src/common/jwt/jwt.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('notifications')
@ApiBearerAuth()
@ValidateAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationGateway,
  ) {}

  @Post()
  async create(@Body() dto: CreateNotificationDto) {
    const notif = await this.notificationService.createNotification(dto);
    this.gateway.pushNotificationToUser(dto.receiverId, notif);

    return notif;
  }

  @Get('me')
  async me(
    @Req() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @GetUser('userId') userId: string,
  ) {
    return this.notificationService.getNotificationsForUser(
      userId,
      Number(page),
      Number(limit),
    );
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @GetUser('userId') userId: string) {
    return await this.notificationService.markAsRead(id, userId);
  }

  @Patch('me/mark-all-read')
  async markAllRead(@Req() req, @GetUser('userId') userId: string) {
    const res = await this.notificationService.markAllRead(userId);
    this.gateway.pushNotificationToUser(userId, { type: 'all_read' });
    return res;
  }
}
