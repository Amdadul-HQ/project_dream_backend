import { Injectable } from '@nestjs/common';
import { HandleError } from '@project/common/error/handle-error.decorator';
import { PrismaService } from '@project/lib/prisma/prisma.service';
import { CreatePostCategoryDto } from '../dto/createPostCategory.dto';
import { successResponse } from '@project/common/utils/response.util';

@Injectable()
export class PostCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Category create Failded')
  async createPostCategory(dto: CreatePostCategoryDto) {
    const category = await this.prisma.category.create({
      data: dto,
    });

    return successResponse(category, 'Category Created successfully');
  }

  @HandleError('Category Fetched Failed')
  async getAllCategory() {
    const categories = await this.prisma.category.findMany();
    return successResponse(categories, 'Category Fetched Successfully');
  }
}
