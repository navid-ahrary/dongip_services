import { BindingScope, ContextTags, injectable, Provider } from '@loopback/core';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY_VALUE } from '../keys';
import { FileUploadHandler } from '../types';

/**
 * A provider to return an `Express` request handler from `multer` middleware
 */
@injectable({
  scope: BindingScope.TRANSIENT,
  tags: { [ContextTags.KEY]: FILE_UPLOAD_SERVICE },
})
export class FileUploadProvider implements Provider<FileUploadHandler> {
  private readonly options: multer.Options = {
    limits: {
      files: 1, // Max number of files
      fileSize: 200000, // Max size of each file in bytes
    },
    fileFilter: (req, file, callback) => {
      const filetypes = /jpeg|jpg|png/;
      const mimetype = filetypes.test(file.mimetype);

      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
        return callback(null, true);
      } else {
        callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE'));
      }
    },
    storage: multer.diskStorage({
      destination: STORAGE_DIRECTORY_VALUE,
      filename: (req, file, callback) => {
        const extname = file.mimetype.split('/')[1].toLowerCase();

        callback(null, uuidv4().replace(/-/g, '') + '.' + extname);
      },
    }),
  };

  constructor() {}

  value(): FileUploadHandler {
    return multer(this.options).any();
  }

  // public fileFilter(
  //   req: Request,
  //   file: Express.multer.File,
  //   callback: multer.FileFilterCallback,
  // ): void {
  //   const filetypes = /jpeg|jpg|png/;
  //   const mimetype = filetypes.test(file.mimetype);

  //   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  //   if (mimetype && extname) {
  //     return callback(null, true);
  //   } else {
  //     callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE'));
  //   }
  // }
}
