import { Injectable } from '@nestjs/common';
import { CreatePostStateDto } from './dto/create-post-state.dto';
import { UpdatePostStateDto } from './dto/update-post-state.dto';

@Injectable()
export class PostStatesService {
  create(createPostStateDto: CreatePostStateDto) {
    return 'This action adds a new postState';
  }

  findAll() {
    return `This action returns all postStates`;
  }

  findOne(id: number) {
    return `This action returns a #${id} postState`;
  }

  update(id: number, updatePostStateDto: UpdatePostStateDto) {
    return `This action updates a #${id} postState`;
  }

  remove(id: number) {
    return `This action removes a #${id} postState`;
  }
}
