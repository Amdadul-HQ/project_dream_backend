import { PartialType } from '@nestjs/swagger';
import { CreateSeriesDto } from './create-post-series.dto';

export class UpdatePostSeriesDto extends PartialType(CreateSeriesDto) {}
