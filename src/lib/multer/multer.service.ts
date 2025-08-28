import { Injectable } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  ANY = 'any',
}

export interface MultipleFileOptions {
  destinationFolder: string;
  prefix: string;
  fileType?: FileType;
  fileSizeLimit?: number;
  maxFileCount?: number;
  customMimeTypes?: string[];
}

type SupportedFileType = Exclude<FileType, FileType.ANY>;

@Injectable()
export class MulterService {
  private mimeTypesMap: Record<SupportedFileType, string[]> = {
    [FileType.IMAGE]: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ],
    [FileType.DOCUMENT]: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    [FileType.VIDEO]: [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/quicktime',
    ],
    [FileType.AUDIO]: [
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/mp3',
      'audio/aac',
    ],
  };

  // Single file upload (existing method)
  public createMulterOptions(
    destinationFolder: string,
    prefix: string,
    fileType: FileType = FileType.IMAGE,
    fileSizeLimit = 10 * 1024 * 1024,
    customMimeTypes?: string[],
  ): MulterOptions {
    const allowedMimeTypes =
      fileType === FileType.ANY
        ? null
        : customMimeTypes || this.mimeTypesMap[fileType] || [];

    return {
      storage: diskStorage({
        destination: destinationFolder,
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${prefix}-${uuid()}${ext}`);
        },
      }),
      limits: {
        fileSize: fileSizeLimit,
      },
      fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes || allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
      },
    };
  }

  // Multiple file upload method
  public createMultipleFileOptions(
    options: MultipleFileOptions,
  ): MulterOptions {
    const {
      destinationFolder,
      prefix,
      fileType = FileType.IMAGE,
      fileSizeLimit = 10 * 1024 * 1024,
      maxFileCount = 10,
      customMimeTypes,
    } = options;

    const allowedMimeTypes =
      fileType === FileType.ANY
        ? null
        : customMimeTypes || this.mimeTypesMap[fileType] || [];

    return {
      storage: diskStorage({
        destination: destinationFolder,
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const timestamp = Date.now();
          cb(null, `${prefix}-${timestamp}-${uuid()}${ext}`);
        },
      }),
      limits: {
        fileSize: fileSizeLimit,
        files: maxFileCount,
      },
      fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes || allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `Unsupported file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`,
            ),
            false,
          );
        }
      },
    };
  }

  // Helper method to get allowed extensions for a file type
  public getAllowedExtensions(fileType: FileType): string[] {
    const allMimeTypes = Object.values(this.mimeTypesMap).flat();
    const mimeTypes =
      fileType === FileType.ANY
        ? allMimeTypes
        : this.mimeTypesMap[fileType as SupportedFileType] || [];

    const extensionMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/ogg': '.ogv',
      'video/avi': '.avi',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'audio/mp3': '.mp3',
      'audio/aac': '.aac',
    };

    return mimeTypes.map((mimeType) => extensionMap[mimeType]).filter(Boolean);
  }

  // Helper method to validate file count
  public validateFileCount(
    files: Express.Multer.File[],
    maxCount: number,
  ): boolean {
    return files && files.length > 0 && files.length <= maxCount;
  }

  // Helper method to get total size of all files
  public getTotalFileSize(files: Express.Multer.File[]): number {
    return files.reduce((total, file) => total + file.size, 0);
  }

  // Helper method to validate total file size
  public validateTotalFileSize(
    files: Express.Multer.File[],
    maxTotalSize: number,
  ): boolean {
    return this.getTotalFileSize(files) <= maxTotalSize;
  }

  // Helper method to create upload path
  public createUploadPath(baseFolder: string, subFolder?: string): string {
    const uploadPath = subFolder
      ? path.join(baseFolder, subFolder)
      : baseFolder;

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    return uploadPath;
  }
}
