import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreateReportDto } from '../dto/createReport.dto';
import { PostStatus, ReportStatus } from '@prisma/client';
import { successResponse } from 'src/common/utils/response.util';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async reportPost(createReportDto: CreateReportDto, reporterId: string) {
    const { postId, reason } = createReportDto;

    // Check if the post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found.`);
    }

    // Create a new report
    const newReport = await this.prisma.report.create({
      data: {
        postId,
        reporterId,
        reason,
        status: ReportStatus.PENDING,
      },
    });

    // Optionally update the post status to 'REPORTED' if it's not already under review
    if (post.status !== PostStatus.UNDER_REVIEW) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: PostStatus.REPORTED },
      });
    }

    return successResponse(newReport, 'Repost Successful');
  }
}
