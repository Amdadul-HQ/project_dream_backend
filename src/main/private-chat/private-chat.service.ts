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
import { GetUserListDto } from './dto/getUserList.dto';

@Injectable()
export class PrivateChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    // private readonly fileService: FileService,
  ) {}

  /** 🔹 Get user list with pagination and last message info */
  async getUserListWithMessages(userId: string, dto: GetUserListDto) {
    const { page = 1, limit = 20, search } = dto;
    const skip = (page - 1) * limit;

    // Build where clause for search
    const searchWhere = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {};

    // Get conversations where current user is a member
    const conversations = await this.prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { userId: { not: userId } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profile: true,
                role: true,
                status: true,
                lastActiveAt: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, name: true },
            },
            statuses: {
              where: { userId },
            },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Get users who have conversations with current user
    const usersWithMessages = conversations
      .filter((conv) => {
        const otherUser = conv.members[0]?.user;
        if (!otherUser) return false;
        if (search) {
          return otherUser.name.toLowerCase().includes(search.toLowerCase());
        }
        return true;
      })
      .map((conv) => {
        const otherUser = conv.members[0]?.user;
        const lastMessage = conv.messages[0];
        const unreadCount =
          lastMessage?.statuses?.[0]?.status !== 'READ' ? 1 : 0;

        return {
          id: otherUser.id,
          name: otherUser.name,
          profile: otherUser.profile,
          role: otherUser.role,
          status: otherUser.status,
          isOnline: this.isUserOnline(otherUser.lastActiveAt),
          conversationId: conv.id,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                senderName: lastMessage.sender.name,
                createdAt: lastMessage.createdAt,
                isRead: lastMessage.statuses?.[0]?.status === 'READ',
              }
            : null,
          unreadCount,
          lastMessageAt: conv.lastMessageAt,
        };
      });

    // Get all other users (who don't have conversations yet)
    const userIdsWithMessages = usersWithMessages.map((u) => u.id);

    const usersWithoutMessages = await this.prisma.user.findMany({
      where: {
        id: { not: userId, notIn: userIdsWithMessages },
        status: { not: 'Banned' },
        ...searchWhere,
      },
      select: {
        id: true,
        name: true,
        profile: true,
        role: true,
        status: true,
        lastActiveAt: true,
      },
      orderBy: { name: 'asc' },
    });

    const usersWithoutMessagesFormatted = usersWithoutMessages.map((user) => ({
      id: user.id,
      name: user.name,
      profile: user.profile,
      role: user.role,
      status: user.status,
      isOnline: this.isUserOnline(user.lastActiveAt),
      conversationId: null,
      lastMessage: null,
      unreadCount: 0,
      lastMessageAt: null,
    }));

    // Combine: users with messages first, then users without messages
    const allUsers = [...usersWithMessages, ...usersWithoutMessagesFormatted];

    // Apply pagination
    const total = allUsers.length;
    const paginatedUsers = allUsers.slice(skip, skip + limit);

    return {
      data: paginatedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** 🔹 Check if user is online (active in last 5 minutes) */
  private isUserOnline(lastActiveAt: Date): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastActiveAt) > fiveMinutesAgo;
  }

  /** 🔹 Get unread message count for a user */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.prisma.privateMessageStatus.count({
      where: {
        userId,
        status: { not: 'READ' },
        message: {
          senderId: { not: userId },
        },
      },
    });

    return count;
  }

  /** 🔹 Update user's last active time */
  async updateUserLastActive(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });
  }

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
