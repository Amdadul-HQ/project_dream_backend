import { Injectable } from '@nestjs/common';
import { CreatePostManagementDto } from './dto/create-post-management.dto';
import { UpdatePostManagementDto } from './dto/update-post-management.dto';

@Injectable()
export class PostManagementService {
  create(createPostManagementDto: CreatePostManagementDto) {
    return 'This action adds a new postManagement';
  }

  findAll() {
    return `This action returns all postManagement`;
  }

  findOne(id: number) {
    return `This action returns a #${id} postManagement`;
  }

  update(id: number, updatePostManagementDto: UpdatePostManagementDto) {
    return `This action updates a #${id} postManagement`;
  }

  remove(id: number) {
    return `This action removes a #${id} postManagement`;
  }
}
