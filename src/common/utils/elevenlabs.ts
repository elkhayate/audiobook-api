import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.elevenlabs.io/v1';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is required');
    }
    this.apiKey = apiKey;
  }

  async textToSpeech(
    text: string,
    voiceId: string = 'pNInz6obpgDQGcFmaJgB',
    audioQuality: 'standard' | 'high' | 'premium' = 'high'
  ): Promise<Buffer> {
    try {
      this.logger.log('Starting text-to-speech conversion with ElevenLabs');

      // Map audio quality to model ID
      const modelId = audioQuality === 'premium' 
        ? 'eleven_multilingual_v2'
        : audioQuality === 'high'
        ? 'eleven_monolingual_v1'
        : 'eleven_monolingual_v1';

      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          responseType: 'arraybuffer',
        },
      );

      this.logger.log('Text-to-speech conversion completed successfully');
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('Error during text-to-speech conversion:', error);
      if (axios.isAxiosError(error)) {
        this.logger.error('ElevenLabs API error:', error.response?.data);
      }
      throw new Error('Failed to convert text to speech');
    }
  }

  async getAvailableVoices() {
    try {
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      // Filter for English voices only
      const englishVoices = response.data.voices.filter(voice => 
        voice.labels?.language === 'en' || // Check explicit language label
        voice.name.toLowerCase().includes('english') // Check name for English
      );

      return englishVoices;
    } catch (error) {
      this.logger.error('Error fetching available voices:', error);
      throw new Error('Failed to fetch available voices');
    }
  }
} 