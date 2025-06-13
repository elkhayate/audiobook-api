import { Controller, Get, Delete, UseGuards, Request, Put, Body } from '@nestjs/common';
import { SettingsService, UserSettings } from './settings.service';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase.guard';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('settings')
@UseGuards(SupabaseAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('voices')
  async getAvailableVoices() {
    return this.settingsService.getAvailableVoices();
  }

  @Get()
  async getUserSettings(@Request() req: AuthenticatedRequest): Promise<UserSettings> {
    return this.settingsService.getUserSettings(req.user);
  }

  @Put()
  async updateUserSettings(
    @Request() req: AuthenticatedRequest,
    @Body() settings: Partial<UserSettings>,
  ): Promise<UserSettings> {
    return this.settingsService.updateUserSettings(req.user, settings);
  }

  @Delete()
  async deleteUser(@Request() req: AuthenticatedRequest): Promise<{ message: string }> {
    await this.settingsService.deleteUser(req.user);
    return { message: 'User and all associated data deleted successfully' };
  }
}
