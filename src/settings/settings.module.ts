import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ElevenLabsService } from '../common/utils/elevenlabs';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, ElevenLabsService],
})
export class SettingsModule {}
