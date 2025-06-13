import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase.guard';
import { DashboardService, DashboardStats } from './dashboard.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('dashboard')
@UseGuards(SupabaseAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboardStats(@Request() req: AuthenticatedRequest): Promise<DashboardStats> {
    return this.dashboardService.getDashboardStats(req.user);
  }
} 