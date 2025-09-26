// report.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreateReportDto } from '../dto/createReport.dto';
import { PostStatus, ReportStatus } from '@prisma/client';
import { successResponse } from 'src/common/utils/response.util';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async reportPost(createReportDto: CreateReportDto, reporterId: string) {
    const { postId, reason, description, type } = createReportDto;

    // Check if the post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found.`);
    }

    // Create a new report
    const newReport = await this.prisma.report.create({
      data: {
        type,
        reason,
        description,
        reporterId,
        reportedPostId: postId, // Correct field name from schema
        status: ReportStatus.PENDING,
      },
    });

    // Optionally update the post status to 'UNDER_REVIEW'
    if (post.status !== PostStatus.UNDER_REVIEW) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: PostStatus.UNDER_REVIEW },
      });
    }

    return successResponse(newReport, 'Report submitted successfully');
  }

  async reportUser(createReportDto: CreateReportDto, reporterId: string) {
    const { userId, reason, description, type } = createReportDto;

    // Check if the user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    // Create a new report
    const newReport = await this.prisma.report.create({
      data: {
        type,
        reason,
        description,
        reporterId,
        reportedUserId: userId, // Correct field name from schema
        status: ReportStatus.PENDING,
      },
    });

    return successResponse(newReport, 'User report submitted successfully');
  }
}
