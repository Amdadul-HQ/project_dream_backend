import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostStatesService } from './post-states.service';
import { CreatePostStateDto } from './dto/create-post-state.dto';
import { UpdatePostStateDto } from './dto/update-post-state.dto';

@Controller('post-states')
export class PostStatesController {
  constructor(private readonly postStatesService: PostStatesService) {}

  @Post()
  create(@Body() createPostStateDto: CreatePostStateDto) {
    return this.postStatesService.create(createPostStateDto);
  }

  @Get()
  findAll() {
    return this.postStatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postStatesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostStateDto: UpdatePostStateDto) {
    return this.postStatesService.update(+id, updatePostStateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postStatesService.remove(+id);
  }
}
