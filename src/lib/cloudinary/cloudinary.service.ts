/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import * as path from 'path';
import {
  Global,
  Injectable,
  // InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENVEnum } from 'src/common/enum/env.enum';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
// import { v4 as uuidv4 } from 'uuid';
// import mime from 'mime-types';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Injectable()
export class CloudinaryService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        ENVEnum.CLOUDINARY_CLOUD_NAME,
      ),
      api_key: this.configService.getOrThrow<string>(
        ENVEnum.CLOUDINARY_API_KEY,
      ),
      api_secret: this.configService.getOrThrow<string>(
        ENVEnum.CLOUDINARY_API_SECRET,
      ),
    });
  }

  async uploadAudioFromBuffer(
    fileBuffer: Buffer,
    filename: string,
    folder = 'project-dream/audio',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const originalNameWithoutExt = filename.replace(/\.[^/.]+$/, '');

      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: originalNameWithoutExt,
          resource_type: 'video', // Required for audio files
          format: 'mp3', // Optional: specify output format
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      Readable.from(fileBuffer).pipe(stream);
    });
  }

  async uploadImageFromBuffer(
    fileBuffer: Buffer,
    filename: string,
    folder = 'project-dream',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      function stripExtension(filename: string): string {
        return filename.replace(/\.[^/.]+$/, '');
      }
      const originalNameWithoutExt = stripExtension(filename);
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: originalNameWithoutExt,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );
      Readable.from(fileBuffer).pipe(stream);
    });
  }

  private extractPublicId(url: string): string {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    const filenameWithExt = parts.slice(-1)[0]; // e.g. Screenshot-2025-07-10-at-10.07.04-PM.png
    const folder = parts.slice(-2, -1)[0]; // e.g. profile-images
    const filename = path.parse(filenameWithExt).name;
    return `${folder}/${filename}`;
  }

  async deleteImage(url: string): Promise<void> {
    const publicId = this.extractPublicId(url);
    await cloudinary.uploader.destroy(publicId);
  }

  // async processUploadedAudio(
  //   file: Express.Multer.File,
  //   postId: string,
  //   seriesId?: string,
  //   part?: number,
  // ): Promise<any> {
  //   try {
  //     if (!file) {
  //       throw new InternalServerErrorException(
  //         'Uploaded audio file is missing',
  //       );
  //     }

  //     const uploadResult = await this.uploadAudioFromBuffer(
  //       file.buffer,
  //       file.originalname,
  //     );

  //     const fileId = uuidv4();
  //     const fileExt = path.extname(file.originalname);
  //     const mimeType =
  //       file.mimetype || mime.lookup(file.originalname) || 'audio/mpeg';

  //     // const createAudioDto = {
  //     //   id: fileId,
  //     //   postId,
  //     //   seriesId,
  //     //   part,
  //     //   filename: `${fileId}${fileExt}`,
  //     //   originalFilename: file.originalname,
  //     //   path: uploadResult.public_id,
  //     //   url: uploadResult.url,
  //     //   mimeType,
  //     //   size: file.size,
  //     // };

  //     // return await this.prisma.audio.create({
  //     //   data: createAudioDto,
  //     // });
  //   } catch (error) {
  //     console.error('Error processing uploaded audio:', error);
  //     throw new InternalServerErrorException('Failed to upload audio file');
  //   }
  // }
}
