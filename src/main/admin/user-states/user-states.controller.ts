import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserStatesService } from './user-states.service';
import { CreateUserStateDto } from './dto/create-user-state.dto';
import { UpdateUserStateDto } from './dto/update-user-state.dto';

@Controller('user-states')
export class UserStatesController {
  constructor(private readonly userStatesService: UserStatesService) {}

  @Post()
  create(@Body() createUserStateDto: CreateUserStateDto) {
    return this.userStatesService.create(createUserStateDto);
  }

  @Get()
  findAll() {
    return this.userStatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userStatesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserStateDto: UpdateUserStateDto) {
    return this.userStatesService.update(+id, updateUserStateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userStatesService.remove(+id);
  }
}
