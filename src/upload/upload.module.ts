import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { OpenAIService } from '../common/utils/openai';
import { ElevenLabsService } from '../common/utils/elevenlabs';
import { StorageService } from '../common/utils/storage';
import { SettingsService } from '../settings/settings.service';
import { RedisModule } from '../common/cache/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [UploadController],
  providers: [UploadService, OpenAIService, ElevenLabsService, StorageService, SettingsService],
})
export class UploadModule {} 