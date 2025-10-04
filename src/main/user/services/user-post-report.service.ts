import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { Report, ReportStatus } from '@prisma/client';
import { CreateReportDto } from '../dto/crete-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { UpdateReportStatusDto } from '../dto/update-report-status.dto';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new report
   */
  async createReport(
    dto: CreateReportDto,
    reporterId: string,
  ): Promise<Report> {
    // Validate that at least one target is provided
    if (!dto.reportedPostId && !dto.reportedUserId) {
      throw new BadRequestException(
        'Either reportedPostId or reportedUserId must be provided',
      );
    }

    // Validate that both targets are not provided
    if (dto.reportedPostId && dto.reportedUserId) {
      throw new BadRequestException(
        'Cannot report both post and user simultaneously',
      );
    }

    // Verify post exists if reporting a post
    if (dto.reportedPostId) {
      const post = await this.prisma.post.findUnique({
        where: { id: dto.reportedPostId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user already reported this post
      const existingReport = await this.prisma.report.findFirst({
        where: {
          reporterId,
          reportedPostId: dto.reportedPostId,
          status: {
            in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
          },
        },
      });

      if (existingReport) {
        throw new BadRequestException('You have already reported this post');
      }
    }

    // Verify user exists if reporting a user
    if (dto.reportedUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.reportedUserId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Cannot report yourself
      if (dto.reportedUserId === reporterId) {
        throw new BadRequestException('You cannot report yourself');
      }

      // Check if user already reported this user
      const existingReport = await this.prisma.report.findFirst({
        where: {
          reporterId,
          reportedUserId: dto.reportedUserId,
          status: {
            in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
          },
        },
      });

      if (existingReport) {
        throw new BadRequestException('You have already reported this user');
      }
    }

    // Create the report
    const report = await this.prisma.report.create({
      data: {
        type: dto.type,
        reason: dto.reason,
        description: dto.description,
        reporterId,
        reportedPostId: dto.reportedPostId,
        reportedUserId: dto.reportedUserId,
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
          },
        },
        reportedPost: {
          select: {
            id: true,
            title: true,
            slug: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    // Create activity log
    await this.createReportActivity(reporterId, report.id);

    return report;
  }

  /**
   * Get reports with pagination and filters
   */
  async getReports(query: ReportQueryDto, userId: string, isAdmin: boolean) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    // Non-admin users can only see their own reports
    if (!isAdmin) {
      where.reporterId = userId;
    }

    // Apply filters
    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.reporterId && isAdmin) {
      where.reporterId = query.reporterId;
    }

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
            },
          },
          reportedPost: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
              author: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          reportedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single report by ID
   */
  async getReportById(reportId: string, userId: string, isAdmin: boolean) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
          },
        },
        reportedPost: {
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            thumbnail: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Non-admin users can only view their own reports
    if (!isAdmin && report.reporterId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return report;
  }

  /**
   * Update report status (Admin only)
   */
  async updateReportStatus(
    reportId: string,
    dto: UpdateReportStatusDto,
    adminId: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reportedPost: {
          select: {
            id: true,
            title: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify reporter about the decision
    if (!dto.status) {
      throw new BadRequestException('Status must be provided');
    }
    await this.notifyReporter(report, dto.status);

    return updatedReport;
  }

  /**
   * Delete a report (Admin only)
   */
  async deleteReport(reportId: string): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.prisma.report.delete({
      where: { id: reportId },
    });
  }

  /**
   * Get report statistics (Admin only)
   */
  async getReportStats() {
    const [total, pending, underReview, resolved, dismissed, byType] =
      await Promise.all([
        this.prisma.report.count(),
        this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
        this.prisma.report.count({
          where: { status: ReportStatus.UNDER_REVIEW },
        }),
        this.prisma.report.count({ where: { status: ReportStatus.RESOLVED } }),
        this.prisma.report.count({ where: { status: ReportStatus.DISMISSED } }),
        this.prisma.report.groupBy({
          by: ['type'],
          _count: true,
        }),
      ]);

    return {
      total,
      byStatus: {
        pending,
        underReview,
        resolved,
        dismissed,
      },
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * Create activity log for report
   */
  private async createReportActivity(
    userId: string,
    reportId: string,
  ): Promise<void> {
    await this.prisma.recentActivity.create({
      data: {
        type: 'POST_CREATED', // You may want to add REPORT_CREATED to ActivityType enum
        description: 'Submitted a report',
        userId,
        targetId: reportId,
        targetType: 'REPORT',
      },
    });
  }

  /**
   * Notify reporter about report decision
   */
  private async notifyReporter(
    report: Report,
    newStatus: ReportStatus,
  ): Promise<void> {
    let content = '';

    switch (newStatus) {
      case ReportStatus.UNDER_REVIEW:
        content = 'Your report is now under review';
        break;
      case ReportStatus.RESOLVED:
        content = 'Your report has been reviewed and resolved';
        break;
      case ReportStatus.DISMISSED:
        content = 'Your report has been reviewed and dismissed';
        break;
    }

    await this.prisma.notification.create({
      data: {
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Report Update',
        content,
        receiverId: report.reporterId,
        data: {
          reportId: report.id,
          status: newStatus,
        },
      },
    });
  }
}
