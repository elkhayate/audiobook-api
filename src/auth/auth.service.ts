import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthenticatedUser } from './supabase.guard';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async resetPassword(user: AuthenticatedUser, newPassword: string): Promise<void> {
    try {
      this.logger.log(`Resetting password for user: ${user.id}`);

      // Validate password
      if (!newPassword || newPassword.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters long');
      }

      // Update user's password
      const { error } = await this.supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );

      if (error) {
        this.logger.error('Error resetting password:', error);
        throw new Error('Failed to reset password');
      }

      this.logger.log(`Password reset successful for user: ${user.id}`);
    } catch (error) {
      this.logger.error('Error in resetPassword:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to reset password');
    }
  }
} 