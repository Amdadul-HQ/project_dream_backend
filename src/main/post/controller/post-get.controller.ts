// controllers/posts-public.controller.ts
import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser } from 'src/common/jwt/jwt.decorator';
import { GetPostsService } from '../services/post-get.service';
import { GetPostsDto, PostSortBy } from '../dto/get-post.dto';

@ApiTags('Posts (Public)')
@Controller('posts')
export class PostsPublicController {
  constructor(private readonly getPostsService: GetPostsService) {}

  /**
   * Get all posts with filters and pagination
   * Supports: recent, popular, following, liked, top_rated
   */
  @Get()
  @ApiOperation({
    summary: 'Get all posts with filters',
    description:
      'Retrieve posts with pagination, sorting (recent/popular/following/liked/top_rated), and category filters',
  })
  async getPosts(
    @Query() dto: GetPostsDto,
    @GetUser('userId') userId?: string, // Optional - works for both authenticated and public
  ) {
    return this.getPostsService.getPosts(dto, userId);
  }

  /**
   * Get recent posts (default)
   */
  @Get('recent')
  @ApiOperation({ summary: 'Get recent posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async getRecentPosts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @GetUser('userId') userId?: string,
  ) {
    return this.getPostsService.getPosts(
      {
        page: page || 1,
        limit: limit || 10,
        sortBy: PostSortBy.RECENT,
        category,
      },
      userId,
    );
  }

  /**
   * Get popular posts (most views + likes)
   */
  @Get('popular')
  @ApiOperation({ summary: 'Get popular posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async getPopularPosts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @GetUser('userId') userId?: string,
  ) {
    return this.getPostsService.getPosts(
      {
        page: page || 1,
        limit: limit || 10,
        sortBy: PostSortBy.POPULAR,
        category,
      },
      userId,
    );
  }

  /**
   * Get top rated posts (most likes + comments + shares)
   */
  @Get('top-rated')
  @ApiOperation({ summary: 'Get top rated posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async getTopRatedPosts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @GetUser('userId') userId?: string,
  ) {
    return this.getPostsService.getPosts(
      {
        page: page || 1,
        limit: limit || 10,
        sortBy: PostSortBy.TOP_RATED,
        category,
      },
      userId,
    );
  }

  /**
   * Get posts from users you follow (requires authentication)
   */
  @Get('following')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get posts from followed users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async getFollowingPosts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @GetUser('userId') userId?: string,
  ) {
    if (!userId) {
      return {
        success: false,
        message: 'Authentication required to see posts from followed users',
        data: { posts: [], pagination: null },
      };
    }

    return this.getPostsService.getFollowingPosts(
      userId,
      page || 1,
      limit || 10,
    );
  }

  /**
   * Get posts you've liked (requires authentication)
   */
  @Get('liked')
  @ApiOperation({ summary: 'Get posts you have liked' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLikedPosts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @GetUser('userId') userId?: string,
  ) {
    if (!userId) {
      return {
        success: false,
        message: 'Authentication required to see liked posts',
        data: { posts: [], pagination: null },
      };
    }

    return this.getPostsService.getLikedPosts(userId, page || 1, limit || 10);
  }

  /**
   * Get trending posts (last 7 days)
   */
  @Get('trending')
  @ApiOperation({ summary: 'Get trending posts from last 7 days' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTrendingPosts(@Query('limit') limit?: number) {
    return this.getPostsService.getTrendingPosts(limit || 10);
  }

  /**
   * Get posts by category
   */
  @Get('category/:categorySlug')
  @ApiOperation({ summary: 'Get posts by category' })
  @ApiParam({
    name: 'categorySlug',
    description: 'Category slug (e.g., horror, thriller, mystery)',
    example: 'horror',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPostsByCategory(
    @Param('categorySlug') categorySlug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @GetUser('userId') userId?: string,
  ) {
    return this.getPostsService.getPostsByCategory(
      categorySlug,
      page || 1,
      limit || 10,
      userId,
    );
  }

  /**
   * Get posts by tag
   */
  @Get('tag/:tagSlug')
  @ApiOperation({ summary: 'Get posts by tag' })
  @ApiParam({
    name: 'tagSlug',
    description: 'Tag slug',
    example: 'supernatural',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPostsByTag(
    @Param('tagSlug') tagSlug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @GetUser('userId') userId?: string,
  ) {
    return this.getPostsService.getPosts(
      {
        page: page || 1,
        limit: limit || 10,
        tag: tagSlug,
        sortBy: PostSortBy.RECENT,
      },
      userId,
    );
  }

  /**
   * Get posts by series
   */
  @Get('series/:seriesId')
  @ApiOperation({ summary: 'Get posts in a series' })
  @ApiParam({
    name: 'seriesId',
    description: 'Series ID',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPostsBySeries(
    @Param('seriesId') seriesId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @GetUser('userId') userId?: string,
  ) {
    return this.getPostsService.getPosts(
      {
        page: page || 1,
        limit: limit || 10,
        seriesId,
        sortBy: PostSortBy.RECENT,
      },
      userId,
    );
  }

  /**
   * Get posts by author/writer
   */
  @Get('author/:authorId')
  @ApiOperation({ summary: 'Get posts by author' })
  @ApiParam({
    name: 'authorId',
    description: 'Author/Writer user ID',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPostsByAuthor(
    @Param('authorId') authorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @GetUser('userId') userId?: string,
  ) {
    return this.getPostsService.getPosts(
      {
        page: page || 1,
        limit: limit || 10,
        authorId,
        sortBy: PostSortBy.RECENT,
      },
      userId,
    );
  }

  /**
   * Search posts
   */
  @Get('search')
  @ApiOperation({ summary: 'Search posts' })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'q',
    description: 'Search query',
    required: true,
    example: 'horror story',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async searchPosts(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @GetUser('userId') userId?: string,
  ) {
    return this.getPostsService.getPosts(
      {
        page: page || 1,
        limit: limit || 10,
        search: query,
        category,
        sortBy: PostSortBy.RECENT,
      },
      userId,
    );
  }
}
