import { Module } from '@nestjs/common';
import { UserStatesService } from './user-states.service';
import { UserStatesController } from './user-states.controller';

@Module({
  controllers: [UserStatesController],
  providers: [UserStatesService],
})
export class UserStatesModule {}
