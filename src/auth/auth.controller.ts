import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard, AuthenticatedUser } from './supabase.guard';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('reset-password')
  async resetPassword(
    @Request() req: AuthenticatedRequest,
    @Body('password') newPassword: string,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(req.user, newPassword);
    return { message: 'Password reset successfully' };
  }
} 