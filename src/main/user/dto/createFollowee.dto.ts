// createFollowee.dto.ts
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFollowDto {
  @ApiProperty({ description: 'The ID of the user to follow' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  followeeId: string;
}
