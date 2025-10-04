import { Injectable } from '@nestjs/common';
import { CreatePostCategoryDto } from './dto/create-post-category.dto';
import { UpdatePostCategoryDto } from './dto/update-post-category.dto';

@Injectable()
export class PostCategoryService {
  create(createPostCategoryDto: CreatePostCategoryDto) {
    return 'This action adds a new postCategory';
  }

  findAll() {
    return `This action returns all postCategory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} postCategory`;
  }

  update(id: number, updatePostCategoryDto: UpdatePostCategoryDto) {
    return `This action updates a #${id} postCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} postCategory`;
  }
}
