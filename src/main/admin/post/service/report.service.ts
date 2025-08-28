import { Injectable, NotFoundException } from '@nestjs/common';
import { PostStatus, ReportStatus } from '@prisma/client';
import { PrismaService } from 'src/lib/prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async resolveReport(reportId: string, adminId: string) {
    // In a real app, you would verify the user is an admin
    // For this example, we assume adminId is valid.

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { post: true },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found.`);
    }

    // Resolve the report
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.RESOLVED },
    });

    // You might also take action on the post itself, e.g., changing its status
    await this.prisma.post.update({
      where: { id: report.postId },
      data: { status: PostStatus.DELETED }, // Example: Delete the post
    });

    return {
      message: `Report ${reportId} resolved and post ${report.postId} deleted by admin ${adminId}.`,
    };
  }

  async dismissReport(reportId: string, adminId: string) {
    // In a real app, you would verify the user is an admin

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found.`);
    }

    // Dismiss the report
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.DISMISSED },
    });

    // Optional: Reset post status if needed, or leave as is
    // For example, if the post was set to 'REPORTED', you might change it back to 'PUBLISHED'
    return { message: `Report ${reportId} dismissed by admin ${adminId}.` };
  }
}
