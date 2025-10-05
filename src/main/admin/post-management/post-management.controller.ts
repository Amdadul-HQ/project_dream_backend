import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostManagementService } from './post-management.service';
import { CreatePostManagementDto } from './dto/create-post-management.dto';
import { UpdatePostManagementDto } from './dto/update-post-management.dto';

@Controller('post-management')
export class PostManagementController {
  constructor(private readonly postManagementService: PostManagementService) {}

  @Post()
  create(@Body() createPostManagementDto: CreatePostManagementDto) {
    return this.postManagementService.create(createPostManagementDto);
  }

  @Get()
  findAll() {
    return this.postManagementService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postManagementService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostManagementDto: UpdatePostManagementDto) {
    return this.postManagementService.update(+id, updatePostManagementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postManagementService.remove(+id);
  }
}
