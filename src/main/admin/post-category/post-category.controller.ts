import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ValidateAdmin } from 'src/common/jwt/jwt.decorator';
import { PostCategoryService } from './service/post-category.service';
import { CreatePostCategoryDto } from './dto/createPostCategory.dto';

@ApiTags('Admin Post Category ---')
@Controller('post-category')
export class PostCategoryController {
  constructor(private readonly postCategoryService: PostCategoryService) {}
  @ApiBearerAuth()
  @ValidateAdmin()
  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  async createCategory(@Body() dto: CreatePostCategoryDto) {
    return this.postCategoryService.createPostCategory(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get All Category' })
  async getAllCategory() {
    return this.postCategoryService.getAllCategory();
  }
}
