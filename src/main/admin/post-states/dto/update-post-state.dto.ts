import { PartialType } from '@nestjs/swagger';
import { CreatePostStateDto } from './create-post-state.dto';

export class UpdatePostStateDto extends PartialType(CreatePostStateDto) {}
