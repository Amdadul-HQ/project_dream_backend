import { PartialType } from '@nestjs/swagger';
import { CreatePostManagementDto } from './create-post-management.dto';

export class UpdatePostManagementDto extends PartialType(CreatePostManagementDto) {}
