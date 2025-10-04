import { ApiProperty } from '@nestjs/swagger';
import { ReportStatus, ReportType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({
    enum: ReportType,
    description: 'Type of report',
    example: 'SPAM',
  })
  @IsEnum(ReportType)
  @IsNotEmpty()
  type: ReportType;

  @ApiProperty({
    description: 'Brief reason for the report',
    example: 'This post contains spam content',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'The post is promoting unauthorized products and services',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID of the post being reported',
    example: 'clx123abc456',
    required: false,
  })
  @IsString()
  @IsOptional()
  reportedPostId?: string;

  @ApiProperty({
    description: 'ID of the user being reported',
    example: 'clx789def012',
    required: false,
  })
  @IsString()
  @IsOptional()
  reportedUserId?: string;

  @ApiProperty({
    enum: ReportStatus,
    description: 'New status for the report',
    example: 'RESOLVED',
  })
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
