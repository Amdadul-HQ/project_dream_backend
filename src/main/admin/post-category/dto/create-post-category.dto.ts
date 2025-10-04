// src/category/dto/create-category.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name (must be unique)',
    example: 'Technology',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique slug for the category (used in URLs)',
    example: 'technology',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'All about the latest tech news and tutorials',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Hex color code for UI theming',
    example: '#3498db',
  })
  @IsOptional()
  @IsString()
  color?: string;
}
