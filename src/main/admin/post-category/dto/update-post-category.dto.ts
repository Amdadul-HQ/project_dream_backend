import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-post-category.dto';

export class UpdatePostCategoryDto extends PartialType(CreateCategoryDto) {}
