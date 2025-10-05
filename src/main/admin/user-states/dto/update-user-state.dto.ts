import { PartialType } from '@nestjs/swagger';
import { CreateUserStateDto } from './create-user-state.dto';

export class UpdateUserStateDto extends PartialType(CreateUserStateDto) {}
