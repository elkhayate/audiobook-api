import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { RedisModule } from '../common/cache/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {} 