import { FileType } from '@prisma/client';
import { IsString, IsNumber, IsEnum } from 'class-validator';

export class CreateFileDto {
  @IsString()
  filename: string;

  @IsString()
  originalFilename: string;

  @IsString()
  path: string;

  @IsString()
  url: string;

  @IsEnum([FileType.docs, FileType.image, FileType.link])
  fileType: FileType;

  @IsString()
  mimeType: string;

  @IsNumber()
  size: number;
}
