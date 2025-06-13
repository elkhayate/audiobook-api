import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async summarizeText(text: string): Promise<string> {
    try {
      this.logger.log('Starting text summarization with OpenAI');
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional summarizer. Create a comprehensive but concise summary of the provided text. Focus on key points, main arguments, and important details. The summary should be engaging and suitable for audio narration.',
          },
          {
            role: 'user',
            content: `Please summarize the following text:\n\n${text}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const summary = completion.choices[0]?.message?.content;
      if (!summary) {
        throw new Error('No summary generated');
      }

      this.logger.log('Text summarization completed successfully');
      return summary;
    } catch (error) {
      this.logger.error('Error during text summarization:', error);
      throw new Error('Failed to summarize text');
    }
  }

  estimateWordCount(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  estimateAudioDuration(wordCount: number): number {
    // Estimate 0.4 seconds per word (approximately 150 words per minute)
    return Math.round(wordCount * 0.4);
  }
} 