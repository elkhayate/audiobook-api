import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucketName = 'audiobooks';

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async uploadAudioFile(audioBuffer: Buffer, originalFilename: string): Promise<string> {
    try {
      this.logger.log('Uploading audio file to Supabase Storage');

      const fileExtension = 'mp3';
      const fileName = `${uuidv4()}-${originalFilename.replace(/\.[^/.]+$/, '')}.${fileExtension}`;

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (error) {
        this.logger.error('Error uploading file to Supabase:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      this.logger.log('Audio file uploaded successfully');
      return urlData.publicUrl;
    } catch (error) {
      this.logger.error('Error during file upload:', error);
      throw new Error('Failed to upload audio file');
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) {
        this.logger.error('Error deleting file from Supabase:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      this.logger.log('File deleted successfully');
    } catch (error) {
      this.logger.error('Error during file deletion:', error);
      throw new Error('Failed to delete file');
    }
  }

  extractFileNameFromUrl(url: string): string {
    return url.split('/').pop() || '';
  }
} 