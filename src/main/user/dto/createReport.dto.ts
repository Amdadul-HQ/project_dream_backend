import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({
    description: 'The unique identifier of the post being reported.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  postId: string;

  @ApiProperty({
    description: 'The reason for reporting the post.',
    example: 'This post contains offensive language.',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
