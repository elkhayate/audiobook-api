import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as pdfParse from 'pdf-parse';
import { OpenAIService } from '../common/utils/openai';
import { ElevenLabsService } from '../common/utils/elevenlabs';
import { StorageService } from '../common/utils/storage';
import { AuthenticatedUser } from '../auth/supabase.guard';
import { SettingsService } from '../settings/settings.service';
import { CacheService } from '../common/cache/cache.service';

export interface UploadResult {
  summary: string;
  audio_url: string;
  duration: number;
  file_size: number;
}

export interface FileRecord {
  id: string;
  user_id: string;
  original_filename: string;
  file_size: number;
  audio_url: string;
  audio_duration: number;
  summary: string;
  created_at: string;
  listen_count: number;
  last_listened_at?: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly supabase: SupabaseClient;
  private readonly CACHE_PREFIX = 'files';

  constructor(
    private configService: ConfigService,
    private openaiService: OpenAIService,
    private elevenLabsService: ElevenLabsService,
    private storageService: StorageService,
    private settingsService: SettingsService,
    private cacheService: CacheService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async processPDF(file: Express.Multer.File, user: AuthenticatedUser): Promise<UploadResult> {
    try {
      this.logger.log(`Processing PDF: ${file.originalname} for user: ${user.id}`);

      // Validate file type
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are allowed');
      }

      // Extract text from PDF
      this.logger.log('Extracting text from PDF');
      let pdfData;
      let extractedText;
      
      try {
        pdfData = await pdfParse(file.buffer, {
          // More lenient parsing options
          max: 0, // No page limit
        });
        extractedText = pdfData.text;
      } catch (pdfError) {
        this.logger.error('PDF parsing failed:', pdfError);
        throw new BadRequestException(
          'Failed to parse PDF. The file may be corrupted, password-protected, or in an unsupported format. Please try a different PDF file.'
        );
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new BadRequestException('No readable text found in PDF. The file may contain only images or be empty.');
      }

      // Summarize text using OpenAI
      this.logger.log('Generating summary with OpenAI');
      const summary = await this.openaiService.summarizeText(extractedText);

      // Get user settings for voice and quality
      this.logger.log('Fetching user settings for audio generation');
      const userSettings = await this.settingsService.getUserSettings(user);

      // Convert summary to audio using ElevenLabs with user's voice and quality settings
      this.logger.log('Converting summary to audio with ElevenLabs');
      const audioBuffer = await this.elevenLabsService.textToSpeech(
        summary,
        userSettings.voiceId,
        userSettings.audioQuality
      );

      // Upload audio to Supabase Storage
      this.logger.log('Uploading audio file to storage');
      const audioUrl = await this.storageService.uploadAudioFile(audioBuffer, file.originalname);

      // Estimate audio duration
      const wordCount = this.openaiService.estimateWordCount(summary);
      const audioDuration = this.openaiService.estimateAudioDuration(wordCount);

      // Save metadata to database
      this.logger.log('Saving file metadata to database');
      await this.saveFileMetadata({
        user_id: user.id,
        original_filename: file.originalname,
        file_size: file.size,
        audio_url: audioUrl,
        audio_duration: audioDuration,
        summary,
      });

      // Invalidate cache
      const cacheKey = this.cacheService.generateKey(this.CACHE_PREFIX, user.id, 'list');
      await this.cacheService.del(cacheKey);

      this.logger.log('PDF processing completed successfully');

      return {
        summary,
        audio_url: audioUrl,
        duration: audioDuration,
        file_size: file.size,
      };
    } catch (error) {
      this.logger.error('Error processing PDF:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to process PDF');
    }
  }

  private async saveFileMetadata(data: {
    user_id: string;
    original_filename: string;
    file_size: number;
    audio_url: string;
    audio_duration: number;
    summary: string;
  }): Promise<FileRecord> {
    const { data: record, error } = await this.supabase
      .from('files')
      .insert([
        {
          user_id: data.user_id,
          original_filename: data.original_filename,
          file_size: data.file_size,
          audio_url: data.audio_url,
          audio_duration: data.audio_duration,
          summary: data.summary,
          listen_count: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error('Error saving file metadata:', error);
      throw new Error('Failed to save file metadata');
    }

    return record;
  }
} 