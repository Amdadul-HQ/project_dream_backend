import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AllPostService } from './service/all-post.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser, ValidateAdmin } from '@project/common/jwt/jwt.decorator';
import { GetAllPostsDto } from './dto/getAllPost.dto';
import { ReportService } from './service/report.service';

@ApiTags('Admin Post ---')
@Controller('admin/posts')
@ApiBearerAuth()
@ValidateAdmin()
export class PostController {
  constructor(
    private readonly allPost: AllPostService,
    private readonly reportService: ReportService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all posts with filters and pagination',
  })
  async posts(@Query() query: GetAllPostsDto) {
    return this.allPost.getAllPosts(query);
  }

  @Patch('report/:id/resolve')
  @ApiOperation({ summary: 'Resolve a reported post (Admin only)' })
  async resolveReport(
    @Param('id') id: string,
    @GetUser('userId') adminId: string,
  ) {
    return this.reportService.resolveReport(id, adminId);
  }

  @Patch('report/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss a reported post (Admin only)' })
  async dismissReport(
    @Param('id') id: string,
    @GetUser('userId') adminId: string,
  ) {
    return this.reportService.dismissReport(id, adminId);
  }
}
