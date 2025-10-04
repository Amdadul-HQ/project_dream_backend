import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  GetUser,
  ValidateAdmin,
  ValidateAuth,
} from 'src/common/jwt/jwt.decorator';
import { Role } from '@prisma/client';
import { ReportService } from '../services/user-post-report.service';
import { CreateReportDto } from '../dto/crete-report.dto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { UpdateReportStatusDto } from '../dto/update-report-status.dto';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
@ValidateAuth()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new report' })
  @ApiResponse({ status: 201, description: 'Report created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createReport(
    @Body() dto: CreateReportDto,
    @GetUser('id') userId: string,
  ) {
    return this.reportService.createReport(dto, userId);
  }

  @Get()
  @ValidateAdmin()
  @ApiOperation({ summary: 'Get all reports with filters' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async getReports(
    @Query() query: ReportQueryDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: Role,
  ) {
    const isAdmin = userRole === Role.ADMIN || userRole === Role.MODERATOR;
    return this.reportService.getReports(query, userId, isAdmin);
  }

  @Get('stats')
  @ValidateAdmin()
  @ApiOperation({ summary: 'Get report statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getStats(@GetUser('role') userRole: Role) {
    if (userRole !== Role.ADMIN && userRole !== Role.MODERATOR) {
      throw new ForbiddenException('Access denied');
    }
    return await this.reportService.getReportStats();
  }

  @Get(':id')
  @ValidateAdmin()
  @ApiOperation({ summary: 'Get a specific report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReportById(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: Role,
  ) {
    const isAdmin = userRole === Role.ADMIN || userRole === Role.MODERATOR;
    return this.reportService.getReportById(id, userId, isAdmin);
  }

  @Patch(':id/status')
  @ValidateAdmin()
  @ApiOperation({ summary: 'Update report status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Report status updated' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
    @GetUser('id') adminId: string,
    @GetUser('role') userRole: Role,
  ) {
    if (userRole !== Role.ADMIN && userRole !== Role.MODERATOR) {
      throw new ForbiddenException('Access denied');
    }
    return this.reportService.updateReportStatus(id, dto, adminId);
  }

  @Delete(':id')
  @ValidateAdmin()
  @ApiOperation({ summary: 'Delete a report (Admin only)' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async deleteReport(@Param('id') id: string, @GetUser('role') userRole: Role) {
    if (userRole !== Role.ADMIN && userRole !== Role.MODERATOR) {
      throw new ForbiddenException('Access denied');
    }
    await this.reportService.deleteReport(id);
    return { success: true, message: 'Report deleted successfully' };
  }
}
