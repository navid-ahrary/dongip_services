// Uncomment these imports to begin using these cool features!

import { inject } from '@loopback/core';
import { model, property, repository } from '@loopback/repository';
import {
  getModelSchemaRef,
  HttpErrors,
  post,
  requestBody,
  Request,
  Response,
  RequestContext,
  RestBindings,
} from '@loopback/rest';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import _ from 'lodash';
import FileType from 'file-type';
import Path from 'path';
import Fs from 'fs';
import { Receipts, Users } from '../models';
import { FileUploadHandler } from '../types';
import { FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY_BINDING } from '../keys';
import { ReceiptsRepository } from '../repositories';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { authenticate } from '@loopback/authentication';

@model()
class UploadResposne extends Receipts {
  @property({ type: 'string' }) path: string;
  @property({ type: 'string' }) mimetype: string;
  @property({ type: 'number' }) size: number;
}

@authenticate('jwt.access')
export class ReceiptsController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
            schema: getModelSchemaRef(UploadResposne),
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
