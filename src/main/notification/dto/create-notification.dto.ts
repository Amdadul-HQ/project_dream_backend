// src/main/notification/dto/create-notification.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsString()
  receiverId: string;

  @IsOptional()
  @IsString()
  senderId?: string;

  @IsOptional()
  postId?: string;

  @IsOptional()
  commentId?: string;

  @IsOptional()
  followId?: string;

  @IsOptional()
  data?: any;
}
