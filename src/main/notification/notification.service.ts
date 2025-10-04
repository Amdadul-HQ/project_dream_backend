// src/main/notification/notification.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        content: dto.content ?? null,
        senderId: dto.senderId ?? null,
        receiverId: dto.receiverId,
        postId: dto.postId ?? null,
        commentId: dto.commentId ?? null,
        followId: dto.followId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: dto.data ?? null,
      },
    });
    return notification;
  }

  async getNotificationsForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { receiverId: userId } }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { receiverId: userId, isRead: false },
    });

    return { items, total, page, limit, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    console.log(notif, 'helloeo', userId);
    if (!notif || notif.receiverId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { receiverId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { success: true };
  }
}
