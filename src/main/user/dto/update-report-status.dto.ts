import { PartialType } from '@nestjs/swagger';
import { CreateReportDto } from './crete-report.dto';

export class UpdateReportStatusDto extends PartialType(CreateReportDto) {}
