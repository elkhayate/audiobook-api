import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase.guard';
import { UploadService, UploadResult } from './upload.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('upload')
@UseGuards(SupabaseAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype === 'application/pdf') {
          callback(null, true);
        } else {
          callback(new BadRequestException('Only PDF files are allowed'), false);
        }
      },
    }),
  )
  async uploadPDF(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadService.processPDF(file, req.user);
  }
} 