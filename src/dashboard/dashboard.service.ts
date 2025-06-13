import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthenticatedUser } from '../auth/supabase.guard';

export interface DashboardStats {
  totalPDFs: number;
  totalAudioFiles: number;
  totalFileSize: number;
  totalListeningTime: number;
  lastUploadDate?: string;
  lastListenedDate?: string;
  weeklyUploadTrend: { date: string; count: number }[];
  weeklyListenTrend: { date: string; count: number }[];
}

interface WeeklyTrendData {
  date: string;
  upload_count: number;
  listen_count: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async getDashboardStats(user: AuthenticatedUser): Promise<DashboardStats> {
    try {
      this.logger.log(`Generating dashboard stats for user: ${user.id}`);

      // Get basic stats
      const { data: files, error: filesError } = await this.supabase
        .from('files')
        .select('file_size, audio_duration, created_at, last_listened_at, listen_count')
        .eq('user_id', user.id);

      if (filesError) {
        this.logger.error('Error fetching files for dashboard:', filesError);
        throw new Error('Failed to fetch dashboard data');
      }

      // Calculate totals
      const totalPDFs = files.length;
      const totalAudioFiles = files.length; // Same as PDFs since each PDF generates one audio
      const totalFileSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0);
      const totalListeningTime = files.reduce((sum, file) => sum + (file.audio_duration || 0), 0);

      // Find latest dates
      const lastUploadDate = files.length > 0 
        ? files.reduce((latest, file) => 
            file.created_at > latest ? file.created_at : latest, 
            files[0].created_at
          )
        : undefined;

      const lastListenedDate = files
        .filter(file => file.last_listened_at)
        .reduce((latest, file) => 
          file.last_listened_at && file.last_listened_at > latest ? file.last_listened_at : latest, 
          ''
        ) || undefined;

      // Get weekly trends
      const weeklyTrends = await this.getWeeklyTrends(user.id);

      return {
        totalPDFs,
        totalAudioFiles,
        totalFileSize,
        totalListeningTime,
        lastUploadDate,
        lastListenedDate,
        weeklyUploadTrend: weeklyTrends.uploads,
        weeklyListenTrend: weeklyTrends.listens,
      };
    } catch (error) {
      this.logger.error('Error generating dashboard stats:', error);
      throw new Error('Failed to generate dashboard statistics');
    }
  }

  private async getWeeklyTrends(userId: string): Promise<{
    uploads: { date: string; count: number }[];
    listens: { date: string; count: number }[];
  }> {
    try {
      // Generate dates for the past 7 days
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      // Get upload counts for each day
      const uploadPromises = dates.map(async (date) => {
        const { count, error } = await this.supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', `${date}T00:00:00.000Z`)
          .lt('created_at', `${date}T23:59:59.999Z`);

        if (error) {
          this.logger.error(`Error fetching upload count for ${date}:`, error);
          return { date, count: 0 };
        }

        return { date, count: count || 0 };
      });

      // Get listen counts for each day (based on last_listened_at)
      const listenPromises = dates.map(async (date) => {
        const { count, error } = await this.supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('last_listened_at', `${date}T00:00:00.000Z`)
          .lt('last_listened_at', `${date}T23:59:59.999Z`);

        if (error) {
          this.logger.error(`Error fetching listen count for ${date}:`, error);
          return { date, count: 0 };
        }

        return { date, count: count || 0 };
      });

      const [uploads, listens] = await Promise.all([
        Promise.all(uploadPromises),
        Promise.all(listenPromises),
      ]);

      return { uploads, listens };
    } catch (error) {
      this.logger.error('Error generating weekly trends:', error);
      // Return empty trends if there's an error
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      return {
        uploads: dates.map(date => ({ date, count: 0 })),
        listens: dates.map(date => ({ date, count: 0 })),
      };
    }
  }
} 