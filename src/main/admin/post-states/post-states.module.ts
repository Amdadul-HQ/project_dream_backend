import { Module } from '@nestjs/common';
import { PostStatesService } from './post-states.service';
import { PostStatesController } from './post-states.controller';

@Module({
  controllers: [PostStatesController],
  providers: [PostStatesService],
})
export class PostStatesModule {}
