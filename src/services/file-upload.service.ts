import { BindingScope, ContextTags, injectable, Provider } from '@loopback/core';
import Multer from 'multer';
import Path from 'path';
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
  private readonly options: Multer.Options = {
    limits: {
      files: 1, // Max number of files
      fileSize: 200000, // Max size of each file in bytes
    },
    fileFilter: (req, file, callback) => {
      const filetypes = /jpeg|jpg|png/;
      const mimetype = filetypes.test(file.mimetype);

      const extname = filetypes.test(Path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
        return callback(null, true);
      } else {
        callback(new Multer.MulterError('LIMIT_UNEXPECTED_FILE'));
      }
    },
    storage: Multer.diskStorage({
      destination: STORAGE_DIRECTORY_VALUE,
      filename: (req, file, callback) => {
        const extname = file.mimetype.split('/')[1].toLowerCase();

        callback(null, uuidv4().replace(/-/g, '') + '.' + extname);
      },
    }),
  };

  constructor() {}

  value(): FileUploadHandler {
    return Multer(this.options).any();
  }

  // public fileFilter(
  //   req: Request,
  //   file: Express.Multer.File,
  //   callback: Multer.FileFilterCallback,
  // ): void {
  //   const filetypes = /jpeg|jpg|png/;
  //   const mimetype = filetypes.test(file.mimetype);

  //   const extname = filetypes.test(Path.extname(file.originalname).toLowerCase());

  //   if (mimetype && extname) {
  //     return callback(null, true);
  //   } else {
  //     callback(new Multer.MulterError('LIMIT_UNEXPECTED_FILE'));
  //   }
  // }
}
