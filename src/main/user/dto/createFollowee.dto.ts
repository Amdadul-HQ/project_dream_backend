import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFollowDto {
  @ApiProperty({
    description: 'The unique identifier of the user to be followed.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsString()
  @IsNotEmpty()
  followeeId: string;
}
