import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser, ValidateAuth } from '@project/common/jwt/jwt.decorator';
import { LikeService } from './service/like.service';
import { CommentService } from './service/comment.service';
import { FollowService } from './service/follow.service';
import { CreateCommentDto } from './dto/createComment.dto';
import { CreateFollowDto } from './dto/createFollowee.dto';
import { CreateReportDto } from './dto/createReport.dto';
import { ReportService } from './service/report.service';
import { PostFeedQueryDto } from './dto/postFeedQuery.dto';
import { PostsService } from './service/posts.service';

@ApiTags('User ---')
@Controller('user/post')
export class UserController {
  constructor(
    private readonly likeService: LikeService,
    private readonly commentService: CommentService,
    private readonly followService: FollowService,
    private readonly reportService: ReportService,
    private readonly postService: PostsService,
  ) {}

  @ApiTags('User Like Post---')
  @ApiBearerAuth()
  @ValidateAuth()
  @Post('like/:postId')
  @ApiOperation({ summary: 'Post A Like' })
  async postLike(
    @Param('postId') postId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.likeService.likePost(postId, userId);
  }

  // Unlike a post
  @ApiTags('User Like Post---')
  @ApiBearerAuth()
  @ValidateAuth()
  @Delete('unlike/:postId')
  @ApiOperation({ summary: 'Unlike a post' })
  async unlikePost(
    @Param('postId') postId: string,
    @GetUser('userId') userId: string,
  ) {
    return await this.likeService.unlikePost(postId, userId);
  }

  // Post Comment
  @ApiTags('User Comment Post---')
  @ApiBearerAuth()
  @ValidateAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new comment on a post' })
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @GetUser('userId') userId: string,
  ) {
    return this.commentService.createComment(createCommentDto, userId);
  }

  @ApiTags('User Comment Post---')
  @ApiBearerAuth()
  @ValidateAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  // @UseGuards(AuthGuard('jwt'))
  async deleteComment(
    @Param('id') id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.commentService.deleteComment(id, userId);
  }

  //   User Follow
  @ApiTags('User Follow Writer---')
  @ApiBearerAuth()
  @ValidateAuth()
  @Post('follow')
  @ApiOperation({ summary: 'Follow a user' })
  async followUser(
    @Body() createFollowDto: CreateFollowDto,
    @GetUser('userId') followerId: string,
  ) {
    return this.followService.followUser(
      followerId,
      createFollowDto.followeeId,
    );
  }
  @ApiTags('User Follow Writer---')
  @ApiBearerAuth()
  @ValidateAuth()
  @Delete('unfollow/:followeeId')
  @ApiOperation({ summary: 'Unfollow a user' })
  async unfollowUser(
    @Param('followeeId') followeeId: string,
    @GetUser('userId') followerId: string,
  ) {
    return this.followService.unfollowUser(followerId, followeeId);
  }

  @ApiTags('User Report Post---')
  @ApiBearerAuth()
  @ValidateAuth()
  @Post('report')
  @ApiOperation({ summary: 'Report a post' })
  async reportPost(
    @Body() createReportDto: CreateReportDto,
    @GetUser('userId') userId: string,
  ) {
    return await this.reportService.reportPost(createReportDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get a feed of posts with pagination' })
  // @UseGuards(AuthGuard('jwt')) // A guard to get user info, but allow unauthenticated access
  async getPostsFeed(
    @Query() query: PostFeedQueryDto,
    @GetUser('userId') userId?: string,
  ) {
    // In a real application, userId would be extracted from a JWT token.
    return await this.postService.getPostsFeed(query, userId);
  }

  @Get(':postId')
  @ApiOperation({ summary: 'Get a single post and increment its view count' })
  async getPostWithViewIncrement(@Param('postId') postId: string) {
    return await this.postService.getPostWithViewIncrement(postId);
  }
}
