import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus, ReportType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({
    enum: ReportStatus,
    description: 'Filter by report status',
  })
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @ApiPropertyOptional({
    enum: ReportType,
    description: 'Filter by report type',
  })
  @IsEnum(ReportType)
  @IsOptional()
  type?: ReportType;

  @ApiPropertyOptional({
    description: 'Filter by reporter user ID',
  })
  @IsString()
  @IsOptional()
  reporterId?: string;
}
