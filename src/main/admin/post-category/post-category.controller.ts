import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-post-category.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ValidateAdmin } from 'src/common/jwt/jwt.decorator';
import { PostCategoryService } from './services/post-category-create.service';

@ApiTags('Admin Post Category ---')
@Controller('post-category')
export class PostCategoryController {
  constructor(private readonly postCategoryService: PostCategoryService) {}
  @ApiBearerAuth()
  @ValidateAdmin()
  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.postCategoryService.createPostCategory(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get All Category' })
  async getAllCategory() {
    return this.postCategoryService.getAllCategory();
  }
}
