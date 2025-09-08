// private-chat.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';

@Injectable()
export class PrivateChatService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateConversation(userId: string, recipientId: string) {
    // Ensure consistent ordering (user1Id < user2Id to prevent duplicate pairs)
    const [firstUser, secondUser] =
      userId < recipientId ? [userId, recipientId] : [recipientId, userId];

    let conversation = await this.prisma.privateConversation.findFirst({
      where: {
        OR: [
          { user1Id: firstUser, user2Id: secondUser },
          { user1Id: secondUser, user2Id: firstUser },
        ],
      },
    });

    if (!conversation) {
      conversation = await this.prisma.privateConversation.create({
        data: {
          user1Id: firstUser,
          user2Id: secondUser,
        },
      });
    }

    return conversation;
  }

  async sendPrivateMessage(
    conversationId: string,
    senderId: string,
    dto: { content: string },
    fileId?: string,
  ) {
    const message = await this.prisma.privateMessage.create({
      data: {
        content: dto.content,
        conversationId,
        senderId,
        fileId,
        statuses: {
          create: [
            {
              userId: senderId,
              status: 'SENT',
            },
          ],
        },
      },
      include: {
        statuses: true,
      },
    });

    return message;
  }

  /**
   * Load chat messages between two users with pagination
   */
  async loadChatHistory(
    userId: string,
    recipientId: string,
    limit = 20,
    cursor?: string,
  ) {
    const conversation = await this.findOrCreateConversation(
      userId,
      recipientId,
    );

    const messages = await this.prisma.privateMessage.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: cursor ? 1 : 0,
      ...(cursor
        ? {
            cursor: { id: cursor },
          }
        : {}),
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
        statuses: true,
      },
    });

    return {
      conversationId: conversation.id,
      messages: messages.reverse(), // oldest first for UI
      nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
    };
  }
}
