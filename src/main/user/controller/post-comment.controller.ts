import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
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
  ApiBody,
} from '@nestjs/swagger';
import { GetUser, ValidateAuth } from 'src/common/jwt/jwt.decorator';
import { CommentService } from '../services/user-post-comment.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';

@ApiTags('Post Comments')
@Controller('posts')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post(':postId/comments')
  @ApiBearerAuth()
  @ValidateAuth()
  @ApiOperation({ summary: 'Create a comment on a post or reply to a comment' })
  @ApiParam({
    name: 'postId',
    description: 'ID of the post',
    type: String,
  })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    schema: {
      example: {
        success: true,
        message: 'Comment created successfully',
        data: {
          id: 'clx123456789',
          content: 'Great article!',
          userId: 'clx987654321',
          postId: 'clx111222333',
          parentId: null,
          likeCount: 0,
          replyCount: 0,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          user: {
            id: 'clx987654321',
            name: 'John Doe',
            profile: 'https://example.com/profile.jpg',
          },
          _count: {
            replies: 0,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @GetUser('userId') userId: string,
  ) {
    return this.commentService.createComment(userId, postId, dto);
  }

  @Get(':postId/comments')
  @ApiOperation({ summary: 'Get comments for a post (top-level only)' })
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
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
  })
  async getPostComments(
    @Param('postId') postId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.commentService.getPostComments(postId, page, limit);
  }

  @Get('comments/:commentId/replies')
  @ApiOperation({ summary: 'Get replies to a comment' })
  @ApiParam({
    name: 'commentId',
    description: 'ID of the parent comment',
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
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Replies retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getCommentReplies(
    @Param('commentId') commentId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.commentService.getCommentReplies(commentId, page, limit);
  }

  @Put('comments/:commentId')
  @ApiBearerAuth()
  @ValidateAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({
    name: 'commentId',
    description: 'ID of the comment to update',
    type: String,
  })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 400, description: 'Can only update own comments' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @GetUser('userId') userId: string,
  ) {
    return this.commentService.updateComment(userId, commentId, dto);
  }

  @Delete('comments/:commentId')
  @ApiBearerAuth()
  @ValidateAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({
    name: 'commentId',
    description: 'ID of the comment to delete',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 400, description: 'Can only delete own comments' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.commentService.deleteComment(userId, commentId);
  }

  @Get('user/comments')
  @ApiBearerAuth()
  @ValidateAuth()
  @ApiOperation({ summary: "Get current user's comments" })
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
  @ApiResponse({
    status: 200,
    description: 'User comments retrieved successfully',
  })
  async getUserComments(
    @GetUser('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.commentService.getUserComments(userId, page, limit);
  }
}
