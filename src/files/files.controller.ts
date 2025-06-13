import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase.guard';
import { FilesService, FileListItem } from './files.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('files')
@UseGuards(SupabaseAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async getFiles(@Request() req: AuthenticatedRequest): Promise<FileListItem[]> {
    return this.filesService.getUserFiles(req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Param('id') fileId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.filesService.deleteFile(fileId, req.user);
    return { message: 'File deleted successfully' };
  }

  @Post('listen/:id')
  @HttpCode(HttpStatus.OK)
  async listenToFile(
    @Param('id') fileId: string, 
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.filesService.listenToFile(fileId, req.user);
    return { message: 'Listen count incremented successfully' };
  }
} 