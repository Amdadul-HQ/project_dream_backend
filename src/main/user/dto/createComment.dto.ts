import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'The ID of the post to comment on' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  postId: string;

  @ApiProperty({ description: 'The content of the comment' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'The ID of the parent comment (for replies)',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  parentId?: string;
}
