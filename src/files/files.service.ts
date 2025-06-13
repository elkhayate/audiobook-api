import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthenticatedUser } from '../auth/supabase.guard';
import { CacheService } from '../common/cache/cache.service';

export interface FileListItem {
  id: string;
  filename: string;
  summary: string;
  audio_url: string;
  created_at: string;
  listen_count: number;
  audio_duration: number;
  file_size: number;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly supabase: SupabaseClient;
  private readonly CACHE_PREFIX = 'files';

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async getUserFiles(user: AuthenticatedUser): Promise<FileListItem[]> {
    try {
      this.logger.log(`Fetching files for user: ${user.id}`);

      // Try to get from cache first
      const cacheKey = this.cacheService.generateKey(this.CACHE_PREFIX, user.id, 'list');
      const cachedFiles = await this.cacheService.get<FileListItem[]>(cacheKey);

      if (cachedFiles) {
        this.logger.log('Returning cached files');
        return cachedFiles;
      }

      // If not in cache, fetch from database
      const { data: files, error } = await this.supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error fetching files:', error);
        throw new Error('Failed to fetch files');
      }

      const fileList = files.map(file => ({
        id: file.id,
        filename: file.original_filename,
        summary: file.summary,
        audio_url: file.audio_url,
        created_at: file.created_at,
        listen_count: file.listen_count,
        audio_duration: file.audio_duration,
        file_size: file.file_size,
      }));

      // Cache the results
      await this.cacheService.set(cacheKey, fileList);

      return fileList;
    } catch (error) {
      this.logger.error('Error in getUserFiles:', error);
      throw new Error('Failed to fetch files');
    }
  }

  async deleteFile(fileId: string, user: AuthenticatedUser): Promise<void> {
    try {
      this.logger.log(`Deleting file: ${fileId} for user: ${user.id}`);

      // First, verify the file belongs to the user and get its audio URL
      const { data: file, error: fetchError } = await this.supabase
        .from('files')
        .select('id, user_id, audio_url')
        .eq('id', fileId)
        .single();

      if (fetchError || !file) {
        this.logger.warn(`File not found: ${fileId}`);
        throw new NotFoundException('File not found');
      }

      if (file.user_id !== user.id) {
        this.logger.warn(`Unauthorized access attempt for file: ${fileId} by user: ${user.id}`);
        throw new NotFoundException('File not found');
      }

      // Delete the audio file from storage
      const fileName = file.audio_url.split('/').pop();
      if (fileName) {
        const { error: storageError } = await this.supabase.storage
          .from('audiobooks')
          .remove([fileName]);

        if (storageError) {
          this.logger.error(`Error deleting audio file ${fileName}:`, storageError);
          throw new Error('Failed to delete audio file from storage');
        }
      }

      // Delete the file record from the database
      const { error: deleteError } = await this.supabase
        .from('files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (deleteError) {
        this.logger.error('Error deleting file record:', deleteError);
        throw new Error('Failed to delete file record');
      }

      // Invalidate cache
      const cacheKey = this.cacheService.generateKey(this.CACHE_PREFIX, user.id, 'list');
      await this.cacheService.del(cacheKey);

      this.logger.log(`Successfully deleted file: ${fileId}`);
    } catch (error) {
      this.logger.error('Error in deleteFile:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to delete file');
    }
  }

  async listenToFile(fileId: string, user: AuthenticatedUser): Promise<void> {
    try {
      this.logger.log(`Recording listen for file: ${fileId} by user: ${user.id}`);

      // First, verify the file belongs to the user
      const { data: file, error: fetchError } = await this.supabase
        .from('files')
        .select('id, user_id')
        .eq('id', fileId)
        .single();

      if (fetchError || !file) {
        this.logger.warn(`File not found: ${fileId}`);
        throw new NotFoundException('File not found');
      }

      if (file.user_id !== user.id) {
        this.logger.warn(`Unauthorized access attempt for file: ${fileId} by user: ${user.id}`);
        throw new NotFoundException('File not found');
      }

      // Call the increment_listen_count function
      const { error: updateError } = await this.supabase
        .rpc('increment_listen_count', { file_id: fileId });

      if (updateError) {
        this.logger.error('Error incrementing listen count:', updateError);
        throw new Error('Failed to record listen event');
      }

      // Invalidate cache
      const cacheKey = this.cacheService.generateKey(this.CACHE_PREFIX, user.id, 'list');
      await this.cacheService.del(cacheKey);

      this.logger.log(`Successfully recorded listen for file: ${fileId}`);
    } catch (error) {
      this.logger.error('Error in listenToFile:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to record listen event');
    }
  }
} 