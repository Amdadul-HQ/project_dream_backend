import { Module } from '@nestjs/common';
import { WriterController } from './writer.controller';
import { WriterService } from './service/writer.service';
import { CreatePostService } from './service/create-post.service';
import { CloudinaryService } from '@project/lib/cloudinary/cloudinary.service';
import { UpdatePostService } from './service/update-post.service';
import { PostsService } from './service/getmypost.service';
import { DeletePostService } from './service/delete-post.service';

@Module({
  controllers: [WriterController],
  providers: [
    WriterService,
    CreatePostService,
    CloudinaryService,
    UpdatePostService,
    PostsService,
    DeletePostService,
  ],
})
export class WriterModule {}
