// createReport.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({
    description: 'Type of report',
    enum: ReportType,
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ description: 'Reason for the report' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Additional description for the report' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'The ID of the post to report' })
  @IsOptional()
  @IsString()
  @IsUUID()
  postId?: string;

  @ApiPropertyOptional({ description: 'The ID of the user to report' })
  @IsOptional()
  @IsString()
  @IsUUID()
  userId?: string;
}
