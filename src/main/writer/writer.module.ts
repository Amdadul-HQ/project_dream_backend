import { Module } from '@nestjs/common';
import { WriterController } from './writer.controller';
import { CreatePostService } from './service/create-post.service';
import { UpdatePostService } from './service/update-post.service';
import { PostsService } from './service/getmypost.service';
import { DeletePostService } from './service/delete-post.service';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';

@Module({
  controllers: [WriterController],
  providers: [
    CreatePostService,
    CloudinaryService,
    UpdatePostService,
    PostsService,
    DeletePostService,
  ],
})
export class WriterModule {}
