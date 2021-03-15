import {
  del,
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  RequestContext,
  RestBindings,
  Request,
  Response,
  HttpErrors,
} from '@loopback/rest';
import { inject, intercept } from '@loopback/context';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { CountSchema, model, property, repository } from '@loopback/repository';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { authenticate } from '@loopback/authentication';
import Path from 'path';
import _ from 'lodash';
import FileType from 'file-type';
import Fs from 'fs';
import { FileUploadHandler } from '../types';
import { Dongs, Receiptions, Users } from '../models';
import { DongsRepository } from '../repositories';
import { FILE_UPLOAD_SERVICE, STATIC_FLIES_PATH_BINDING, STORAGE_DIRECTORY_BINDING } from '../keys';
import { ValidateDongIdInterceptor } from '../interceptors';
import { ReceiptionsRepository } from '../repositories/receiptions.repository';

@model()
class UploadResposne extends Receiptions {
  @property({ type: 'string' }) path: string;
  @property({ type: 'string' }) mimetype: string;
  @property({ type: 'number' }) size: number;
}

@authenticate('jwt.access')
@intercept(ValidateDongIdInterceptor.BINDING_KEY)
export class DongsReceiptionsController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  /**
   * Constructor
   * @param handler - Inject an express request handler to deal with the request
   */
  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @inject(STATIC_FLIES_PATH_BINDING) private staticFilesPath: string,
    @inject(STORAGE_DIRECTORY_BINDING) private storageDirectory: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @repository(DongsRepository) public dongRepo: DongsRepository,
    @repository(ReceiptionsRepository) public receiptRepo: ReceiptionsRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @get('/dongs/{dongId}/receiptions', {
    summary: "Get Dongs's receiptions by dongId",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dongs has many Receiptions',
        content: {
          'application/json': {
            schema: getModelSchemaRef(UploadResposne),
          },
        },
      },
    },
  })
  async findDongsReceiptions(
    @param.path.number('dongId') dongId: typeof Dongs.prototype.dongId,
  ): Promise<object> {
    const foundReceipts = await this.receiptRepo.findOne({
      where: { userId: this.userId, dongId: dongId },
    });

    if (!foundReceipts) return {};

    const filename = foundReceipts.filename;
    const file = await this.validateFileName(filename);

    return { ...foundReceipts, ...file };
  }

  @post('/dongs/{dongId}/receiptions', {
    summary: "Upload Dongs's receiptions by dongId",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        content: {
          'application/json': {
            schema: getModelSchemaRef(UploadResposne),
          },
        },
        description: 'File details',
      },
    },
  })
  async uploadDongReceiption(
    @param.path.number('dongId') dongId: typeof Dongs.prototype.dongId,
    @requestBody.file() request: Request,
  ): Promise<object> {
    let result = {};

    try {
      // eslint-disable-next-line @typescript-eslint/return-await
      result = await new Promise<object>((resolve, reject) => {
        this.handler(request, this.response, (err: unknown) => {
          if (err) reject(err);
          else {
            resolve(this.getFiles(request));
          }
        });
      });

      const savedReceipt = await this.dongRepo
        .receiptions(dongId)
        .create({ userId: this.userId, filename: _.get(result, 'filename') });

      return { ...savedReceipt, ...result };
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

        throw new HttpErrors.Conflict('Just one');
      } else {
        throw new HttpErrors.UnprocessableEntity(err.message);
      }
    }
  }

  @del('/dongs/{dongId}/receiptions', {
    summary: "Delete Dongs's receiptions by dongId",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dongs.Receiptions DELETE success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async delete(@param.path.number('dongId') dongId: typeof Dongs.prototype.dongId) {
    try {
      await this.dongRepo.receiptions(dongId).delete({ userId: this.userId });
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  /**
   * Validate file names to prevent them goes beyond the designated directory
   * @param fileName - File name
   */
  private async validateFileName(filename: string) {
    const resolved = Path.resolve(this.storageDirectory, filename);

    if (resolved.startsWith(this.storageDirectory)) {
      return {
        filename: filename,
        path: this.getUrlPath(filename),
        mimetype: (await FileType.fromFile(resolved))?.mime,
        sizeBytes: Fs.statSync(resolved).size,
      };
    } else {
      // The resolved file is outside sandbox
      throw new HttpErrors.BadRequest(`Invalid file name: ${filename}`);
    }
  }

  /**
   * Get files and fields for the request
   * @param request - Http request
   */
  private getFiles(request: Request) {
    const uploadedFiles = request.files;

    const mapper = (f: globalThis.Express.Multer.File) => ({
      filename: f.filename,
      path: this.getUrlPath(f.filename),
      mimetype: f.mimetype,
      sizeBytes: f.size,
      // fieldname: f.fieldname,
      // originalname: f.originalname,
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

  private getUrlPath(filename: string): string {
    return Path.join(this.staticFilesPath, filename);
  }

  private getFilePath(filename: string): string {
    return Path.join(this.storageDirectory, filename);
  }
}
