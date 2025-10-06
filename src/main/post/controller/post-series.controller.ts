import { Body, Controller, Get, Injectable, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser, ValidateAuth } from 'src/common/jwt/jwt.decorator';
import { PostSeriesService } from '../services/post-series.service';
import { CreateSeriesDto } from '../dto/create-post-series.dto';

@ApiTags('Writer ---')
@Controller('writer/post')
@ApiBearerAuth()
@ValidateAuth()
@Injectable()
export class PostSeriesController {
  constructor(private readonly postSeriesService: PostSeriesService) {}

  // Post series create, update, get, delete
  @Post('/create-series')
  @ApiOperation({ summary: 'Create a post series' })
  async createSeries(
    @Body() dto: CreateSeriesDto,
    @GetUser('userId') userId: string,
  ) {
    return this.postSeriesService.createSeries(dto, userId);
  }

  // Get Series by user
  @Get('/series-by-user')
  @ApiOperation({ summary: 'Get all series by the authenticated user' })
  async getSeriesByUser(@GetUser('userId') userId: string) {
    return this.postSeriesService.getSeriesByUserId(userId);
  }
}
