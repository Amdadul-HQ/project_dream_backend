import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { GetUser, ValidateAuth } from 'src/common/jwt/jwt.decorator';
import { PostLikeService } from '../services/user-post-like.service';

@ApiTags('Post Likes')
@Controller('posts')
export class PostLikeController {
  constructor(private readonly postLikeService: PostLikeService) {}

  @Post(':postId/like')
  @ApiBearerAuth()
  @ValidateAuth()
  @ApiOperation({ summary: 'Like a post' })
  @ApiParam({
    name: 'postId',
    description: 'ID of the post to like',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Post liked successfully',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 409, description: 'Already liked' })
  async likePost(
    @Param('postId') postId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.postLikeService.likePost(userId, postId);
  }

  @Delete(':postId/like')
  @ApiBearerAuth()
  @ValidateAuth()
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiParam({
    name: 'postId',
    description: 'ID of the post to unlike',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Post unliked successfully',
  })
  @ApiResponse({ status: 404, description: 'Not liked' })
  async unlikePost(
    @Param('postId') postId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.postLikeService.unlikePost(userId, postId);
  }

  @Get(':postId/likes')
  @ApiOperation({ summary: 'Get users who liked a post' })
  @ApiParam({
    name: 'postId',
    description: 'ID of the post',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
  })
  async getPostLikes(
    @Param('postId') postId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.postLikeService.getPostLikes(postId, page, limit);
  }

  @Get(':postId/like/check')
  @ApiBearerAuth()
  @ValidateAuth()
  @ApiOperation({ summary: 'Check if user has liked a post' })
  @ApiParam({
    name: 'postId',
    description: 'ID of the post',
    type: String,
  })
  async hasLikedPost(
    @Param('postId') postId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.postLikeService.hasLikedPost(userId, postId);
  }

  @Get('user/liked')
  @ApiBearerAuth()
  @ValidateAuth()
  @ApiOperation({ summary: "Get current user's liked posts" })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
  })
  async getUserLikedPosts(
    @GetUser('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.postLikeService.getUserLikedPosts(userId, page, limit);
  }
}
