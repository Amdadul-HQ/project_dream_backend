import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
// import { FileService } from 'src/lib/utils/file.service';
import { SendPrivateMessageDto } from './dto/privateChatGateway.dto';
import {
  PrivateMessage,
  PrivateMessageStatus,
  Conversation,
} from '@prisma/client';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class PrivateChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    // private readonly fileService: FileService,
  ) {}

  /** 🔹 Find or create a direct conversation between two users */
  async findOrCreateConversation(
    userA: string,
    userB: string,
  ): Promise<Conversation> {
    // Enforce consistent ordering
    const [firstUser, secondUser] = [userA, userB].sort();

    // Check if a direct conversation exists
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        members: {
          some: { userId: firstUser },
        },
      },
      include: {
        members: true,
      },
    });

    // If no conversation exists, create one
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          type: 'DIRECT',
          members: {
            createMany: {
              data: [{ userId: firstUser }, { userId: secondUser }],
            },
          },
        },
        include: { members: true },
      });
    }

    return conversation;
  }

  /** 🔹 Send a private message */
  async sendPrivateMessage(
    conversationId: string,
    senderId: string,
    dto: SendPrivateMessageDto,
    // file?: Express.Multer.File,
  ): Promise<
    PrivateMessage & { file?: any; statuses?: PrivateMessageStatus[] }
  > {
    let fileRecord;
    // if (file) {
    //   fileRecord = await this.fileService.processUploadedFile(file);
    // }

    // Check conversation exists
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Create message
    const message = await this.prisma.privateMessage.create({
      data: {
        content: dto.content,
        conversationId,
        senderId,
        receiverId:
          conversation.members.find((m) => m.userId !== senderId)?.userId ??
          null,
      },
      include: { sender: true, statuses: true },
    });

    // Get receiver ID
    const receiverId = conversation.members.find(
      (m) => m.userId !== senderId,
    )?.userId;

    if (receiverId) {
      // Create notification in DB
      const notification = await this.prisma.notification.create({
        data: {
          type: 'SYSTEM_ANNOUNCEMENT', // Or create NEW_MESSAGE type
          title: 'New Message',
          content: `${message.sender.name} sent you a message`,
          senderId,
          receiverId,
          data: {
            conversationId,
            messageId: message.id,
          },
        },
      });

      // Push real-time notification
      this.notificationGateway.pushNotificationToUser(receiverId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        isRead: false,
        createdAt: notification.createdAt,
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          profile: message.sender.profile,
        },
        metadata: {
          conversationId,
          messageId: message.id,
        },
      });
    }

    // Create "DELIVERED" status for all members
    await this.prisma.privateMessageStatus.createMany({
      data: conversation.members.map((member) => ({
        messageId: message.id,
        userId: member.userId,
        status: 'DELIVERED',
      })),
      skipDuplicates: true,
    });

    const statuses = await this.prisma.privateMessageStatus.findMany({
      where: { messageId: message.id },
    });

    return { ...message, file: fileRecord ?? null, statuses };
  }

  /** 🔹 Load messages with pagination */
  async getConversationMessages(
    conversationId: string,
    limit = 20,
    cursor?: string,
  ) {
    const messages = await this.prisma.privateMessage.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true, profile: true } },
        statuses: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
    });

    return {
      messages: messages.reverse(),
      nextCursor: messages.length ? messages[messages.length - 1].id : null,
    };
  }

  /** 🔹 Get all user conversations with last message preview */
  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, profile: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true, profile: true } },
            statuses: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** 🔹 Mark messages as READ */
  async markMessagesAsRead(conversationId: string, userId: string) {
    await this.prisma.privateMessageStatus.updateMany({
      where: { message: { conversationId }, userId, status: { not: 'READ' } },
      data: { status: 'READ' },
    });
  }
}
