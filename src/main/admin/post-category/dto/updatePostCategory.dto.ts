import { PartialType } from '@nestjs/swagger';
import { CreatePostCategoryDto } from './createPostCategory.dto';

export class UpdatePostDto extends PartialType(CreatePostCategoryDto) {}
