import { Injectable } from '@nestjs/common';
import { HandleError } from 'src/common/error/handle-error.decorator';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-post-category.dto';
import { successResponse } from 'src/common/utils/response.util';

@Injectable()
export class PostCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Category create Failded')
  async createPostCategory(dto: CreateCategoryDto) {
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
