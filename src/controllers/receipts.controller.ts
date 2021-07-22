// Uncomment these imports to begin using these cool features!

import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import {
  HttpErrors,
  post,
  Request,
  requestBody,
  RequestContext,
  Response,
  RestBindings,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import FileType from 'file-type';
import Fs from 'fs';
import _ from 'lodash';
import Path from 'path';
import { FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY_BINDING } from '../keys';
import { Users } from '../models';
import { ReceiptsRepository } from '../repositories';
import { CurrentUserProfile } from '../services';
import { FileUploadHandler } from '../types';

@authenticate('jwt.access')
export class ReceiptsController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @inject(STORAGE_DIRECTORY_BINDING) private storageDirectory: string,
    @repository(ReceiptsRepository) public receiptRepo: ReceiptsRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @post('/receipts', {
    summary: 'Upload a receipts',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        description: 'File details',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                receiptId: { type: 'number' },
                receiptName: { type: 'string' },
                userId: { type: 'number' },
                mimetype: { type: 'string' },
                sizeBytes: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  async uploadDongReceipt(
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<object> {
    let result = new Object({});

    try {
      result = await new Promise<object>((resolve, reject) => {
        this.handler(request, response, (err: unknown) => {
          if (err) reject(err);
          else {
            resolve(this.getFiles(request));
          }
        });
      });

      const savedReceipt = await this.receiptRepo.create({
        userId: this.userId,
        receiptName: _.get(result, 'filename'),
      });

      return { ...savedReceipt, ..._.omit(result, 'filename') };
    } catch (err) {
      console.error(JSON.stringify(err));

      if (err.code === 'LIMIT_FILE_SIZE') {
        throw new HttpErrors.PayloadTooLarge(err.message);
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        throw new HttpErrors.UnsupportedMediaType('');
      } else if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        const filename = _.get(result, 'filename');
        const filePath = this.getFilePath(filename);

        if (Fs.existsSync(filePath)) Fs.unlinkSync(filePath);

        throw new HttpErrors.Conflict('Just one receipt allowed');
      } else {
        throw new HttpErrors.UnprocessableEntity(err.message);
      }
    }
  }

  /**
   * Get files and fields for the request
   * @param request - Http request
   */
  public getFiles(request: Request) {
    const uploadedFiles = request.files;

    const mapper = (f: globalThis.Express.Multer.File) => ({
      filename: f.filename,
      mimetype: f.mimetype,
      sizeBytes: f.size,
    });

    let filesDetails: object[] = [];

    if (_.isArray(uploadedFiles)) {
      filesDetails = uploadedFiles.map(mapper);
    } else {
      for (const filename in uploadedFiles) {
        filesDetails.push(...uploadedFiles[filename].map(mapper));
      }
    }
    return filesDetails.length === 1 ? filesDetails[0] : filesDetails;
  }

  /**
   * Validate file names to prevent them goes beyond the designated directory
   * @param filename - File name
   */
  public async validateFileName(filename: string) {
    const resolved = Path.resolve(this.storageDirectory, filename);

    if (resolved.startsWith(this.storageDirectory)) {
      return {
        filename: filename,
        path: this.getFilePath(filename),
        mimetype: (await FileType.fromFile(resolved))?.mime,
        sizeBytes: Fs.statSync(resolved).size,
      };
    } else {
      // The resolved file is outside sandbox
      throw new HttpErrors.BadRequest(`Invalid file name: ${filename}`);
    }
  }

  public getFilePath(filename: string): string {
    return Path.join(this.storageDirectory, filename);
  }
}
