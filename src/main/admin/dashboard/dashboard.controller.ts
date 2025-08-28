import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { DashboardStatsDto } from './dto/dashboardStats.dto';
import { DashboardService } from './service/dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly adminService: DashboardService) {}
  @Get('dashboard/stats')
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('post/:postId/details')
  async getPostDetails(@Param('postId') postId: string) {
    return this.adminService.getPostDetails(postId);
  }

  @Get('user/:userId/details')
  @ApiOperation({
    summary:
      'Get detailed view for a single user, including their posts and engagement (Admin only)',
  })
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminService.getUserDetails(userId);
  }
}
