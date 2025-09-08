import { Injectable, NotFoundException } from '@nestjs/common';
import { PrivateMessage } from '@prisma/client';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { FileService } from 'src/lib/utils/file.service';
import { SendPrivateMessageDto } from './dto/privateChatGateway.dto';

@Injectable()
export class PrivateChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
  ) {}

  /**
   * Find or create a conversation between two users.
   */
  async findOrCreateConversation(userA: string, userB: string) {
    const [user1Id, user2Id] = [userA, userB].sort(); // enforce consistent ordering

    let conversation = await this.prisma.privateConversation.findUnique({
      where: {
        user1Id_user2Id: { user1Id, user2Id },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.privateConversation.create({
        data: { user1Id, user2Id },
      });
    }

    return conversation;
  }

  /**
   * Send a private message with optional file attachment.
   */
  async sendPrivateMessage(
    conversationId: string,
    senderId: string,
    dto: SendPrivateMessageDto,
    file?: Express.Multer.File,
  ): Promise<PrivateMessage & { file?: any; sender: any; statuses?: any[] }> {
    let fileRecord;

    if (file) {
      fileRecord = await this.fileService.processUploadedFile(file);
    }

    const message = await this.prisma.privateMessage.create({
      data: {
        content: dto.content,
        conversationId,
        senderId,
      },
      include: {
        sender: true,
      },
    });

    const conversation = await this.prisma.privateConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // Assign "DELIVERED" status for both participants
    await this.prisma.privateMessageStatus.createMany({
      data: [
        {
          messageId: message.id,
          userId: conversation.user1Id,
          status: 'DELIVERED',
        },
        {
          messageId: message.id,
          userId: conversation.user2Id,
          status: 'DELIVERED',
        },
      ],
      skipDuplicates: true,
    });

    return {
      ...message,
      file: fileRecord ?? null,
      statuses: await this.prisma.privateMessageStatus.findMany({
        where: { messageId: message.id },
      }),
    };
  }

  /**
   * Get paginated messages for a conversation (chat loader).
   */
  async getConversationMessages(
    conversationId: string,
    limit = 20,
    cursor?: string,
  ) {
    const messages = await this.prisma.privateMessage.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, name: true, profile: true },
        },
        statuses: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
    });

    return {
      messages: messages.reverse(), // oldest first for chat UI
      nextCursor: messages.length ? messages[messages.length - 1].id : null,
    };
  }

  /**
   * Get all user conversations with the latest message preview.
   */
  async getUserConversations(userId: string) {
    return this.prisma.privateConversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true, profile: true } },
            statuses: true,
          },
        },
        user1: { select: { id: true, name: true, profile: true } },
        user2: { select: { id: true, name: true, profile: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Mark messages as READ for a user in a conversation.
   */
  async markMessagesAsRead(conversationId: string, userId: string) {
    await this.prisma.privateMessageStatus.updateMany({
      where: {
        message: { conversationId },
        userId,
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });
  }
}
