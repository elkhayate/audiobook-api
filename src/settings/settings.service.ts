import { Injectable, Logger } from '@nestjs/common';
import { ElevenLabsService } from '../common/utils/elevenlabs';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthenticatedUser } from '../auth/supabase.guard';

export interface UserSettings {
  fullName: string;
  email: string;
  audioQuality: "standard" | "high" | "premium";
  voiceId: string;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private elevenLabsService: ElevenLabsService,
    private configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async getAvailableVoices() {
    try {
      this.logger.log('Fetching available voices from ElevenLabs');
      const voices = await this.elevenLabsService.getAvailableVoices();
      return voices;
    } catch (error) {
      this.logger.error('Error fetching available voices:', error);
      throw new Error('Failed to fetch available voices');
    }
  }

  async getUserSettings(user: AuthenticatedUser): Promise<UserSettings> {
    try {
      this.logger.log(`Fetching user settings for user: ${user.id}`);

      const { data: userData, error } = await this.supabase.auth.admin.getUserById(user.id);

      if (error) {
        this.logger.error('Error fetching user data:', error);
        throw new Error('Failed to fetch user settings');
      }

      if (!userData.user) {
        throw new Error('User not found');
      }

      const userMetadata = userData.user.user_metadata || {};
      
      return {
        fullName: userMetadata.name || '',
        email: userData.user.email || '',
        audioQuality: userMetadata.audioQuality || 'high',
        voiceId: userMetadata.voiceId || '9BWtsMINqrJLrRacOk9x', 
      };
    } catch (error) {
      this.logger.error('Error in getUserSettings:', error);
      throw new Error('Failed to fetch user settings');
    }
  }

  async deleteUser(user: AuthenticatedUser): Promise<void> {
    try {
      this.logger.log(`Deleting user and associated data for user: ${user.id}`);

      // 1. Delete all user's files from storage
      const { data: files, error: filesError } = await this.supabase
        .from('files')
        .select('audio_url')
        .eq('user_id', user.id);

      if (filesError) {
        this.logger.error('Error fetching user files:', filesError);
        throw new Error('Failed to fetch user files');
      }

      // Delete each audio file from storage
      for (const file of files) {
        const fileName = file.audio_url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await this.supabase.storage
            .from('audiobooks')
            .remove([fileName]);

          if (storageError) {
            this.logger.error(`Error deleting file ${fileName}:`, storageError);
            // Continue with other deletions even if one fails
          }
        }
      }

      // 2. Delete all user's records from the database
      const { error: deleteError } = await this.supabase
        .from('files')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        this.logger.error('Error deleting user records:', deleteError);
        throw new Error('Failed to delete user records');
      }

      // 3. Delete the user from Supabase Auth
      const { error: authError } = await this.supabase.auth.admin.deleteUser(user.id);

      if (authError) {
        this.logger.error('Error deleting user from auth:', authError);
        throw new Error('Failed to delete user from auth');
      }

      this.logger.log(`Successfully deleted user and all associated data for user: ${user.id}`);
    } catch (error) {
      this.logger.error('Error in deleteUser:', error);
      throw new Error('Failed to delete user and associated data');
    }
  }

  async updateUserSettings(user: AuthenticatedUser, settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      this.logger.log(`Updating user settings for user: ${user.id}`);

      const { data: userData, error } = await this.supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            name: settings.fullName,
            audioQuality: settings.audioQuality,
            voiceId: settings.voiceId,
          },
        }
      );

      if (error) {
        this.logger.error('Error updating user settings:', error);
        throw new Error('Failed to update user settings');
      }

      if (!userData.user) {
        throw new Error('User not found');
      }

      const userMetadata = userData.user.user_metadata || {};
      
      return {
        fullName: userMetadata.name || '',
        email: userData.user.email || '',
        audioQuality: userMetadata.audioQuality || 'high',
        voiceId: userMetadata.voiceId || '9BWtsMINqrJLrRacOk9x',
      };
    } catch (error) {
      this.logger.error('Error in updateUserSettings:', error);
      throw new Error('Failed to update user settings');
    }
  }
}
