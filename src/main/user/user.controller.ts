import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser, ValidateAuth } from 'src/common/jwt/jwt.decorator';
import { FollowService } from './services/user-follower.service';

@ApiTags('User ---')
@Controller('user')
@ApiBearerAuth()
@ValidateAuth()
@Controller('user')
export class UserController {
  constructor(private readonly followService: FollowService) {}

  @ApiTags('User Follow---')
  @Post('follow/:userId')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user to follow',
    type: String,
  })
  async followUser(
    @Param('userId') followeeId: string,
    @GetUser('userId') followerId: string,
  ) {
    return this.followService.followUser(followerId, followeeId);
  }
  @ApiTags('User Follow---')
  @Delete('follow/:userId')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user to unfollow',
    type: String,
  })
  async unfollowUser(
    @Param('userId') followeeId: string,
    @GetUser('userId') followerId: string,
  ) {
    return this.followService.unfollowUser(followerId, followeeId);
  }
  @ApiTags('User Follow---')
  @Get('followers/:userId')
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.followService.getFollowers(userId, page, limit);
  }
  @ApiTags('User Follow---')
  @Get('following/:userId')
  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.followService.getFollowing(userId, page, limit);
  }
  @ApiTags('User Follow---')
  @Get('check/:userId')
  @ApiOperation({ summary: 'Check if following a user' })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user to check',
    type: String,
  })
  async isFollowing(
    @Param('userId') followeeId: string,
    @GetUser('userId') followerId: string,
  ) {
    return this.followService.isFollowing(followerId, followeeId);
  }
}
