import { Injectable, NotFoundException } from '@nestjs/common'; // ← import your file service
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

  async findOrCreateConversation(userA: string, userB: string) {
    const [user1Id, user2Id] = [userA, userB].sort(); // enforce consistent ordering

    let conversation = await this.prisma.privateConversation.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.privateConversation.create({
        data: { user1Id, user2Id },
      });
    }

    return conversation;
  }

  async sendPrivateMessage(
    conversationId: string,
    senderId: string,
    dto: SendPrivateMessageDto,
    file?: Express.Multer.File,
  ): Promise<PrivateMessage & { file?: any; sender: any }> {
    let fileRecord;

    if (file) {
      fileRecord = await this.fileService.processUploadedFile(file);
    }

    const message = await this.prisma.privateMessage.create({
      data: {
        content: dto.content,
        conversationId,
        senderId,
        fileId: fileRecord?.id,
      },
      include: {
        sender: true,
      },
    });

    // Fetch both participants to assign delivery status
    const conversation = await this.prisma.privateConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

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

    return message;
  }

  async getConversationMessages(conversationId: string) {
    return this.prisma.privateMessage.findMany({
      where: { conversationId },
      include: {
        sender: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getUserConversations(userId: string) {
    return this.prisma.privateConversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
