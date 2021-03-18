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
  oas,
} from '@loopback/rest';
import { inject, intercept } from '@loopback/context';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { model, property, repository } from '@loopback/repository';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { authenticate } from '@loopback/authentication';
import FileType from 'file-type';
import _ from 'lodash';
import Path from 'path';
import Fs from 'fs';
import { FileUploadHandler } from '../types';
import { Dongs, Receipts, Users } from '../models';
import { DongsRepository } from '../repositories';
import { FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY_BINDING } from '../keys';
import { ValidateDongIdInterceptor } from '../interceptors';
import { ReceiptionsRepository } from '../repositories/receipts.repository';

@model()
class UploadResposne extends Receipts {
  @property({ type: 'string' }) path: string;
  @property({ type: 'string' }) mimetype: string;
  @property({ type: 'number' }) size: number;
}

@authenticate('jwt.access')
@intercept(ValidateDongIdInterceptor.BINDING_KEY)
export class DongsReceiptsController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  /**
   * Constructor
   * @param handler - Inject an express request handler to deal with the request
   */
  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @inject(STORAGE_DIRECTORY_BINDING) private storageDirectory: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @repository(DongsRepository) public dongRepo: DongsRepository,
    @repository(ReceiptionsRepository) public receiptRepo: ReceiptionsRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @get('/dongs/{dongId}/receipts')
  @oas.response.file('image/jpeg', 'image/jpg', 'image/png')
  @authenticate('jwt.access')
  async downloafDongsReceipts(
    @param.path.number('dongId') dongId: typeof Dongs.prototype.dongId,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<Response | undefined> {
    const foundReceipts = await this.receiptRepo.findOne({
      where: { userId: this.userId, dongId: dongId },
    });

    if (!foundReceipts) return;

    const fileName = foundReceipts.fileName;
    const file = await this.validateFileName(fileName);
    response.download(file.path, fileName);

    return response;
  }

  @post('/dongs/{dongId}/receipts', {
    summary: "Upload Dongs's receipts by dongId",
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
    @param.path.number('dongId') dongId: typeof Dongs.prototype.dongId,
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<object> {
    let result = {};

    try {
      // eslint-disable-next-line @typescript-eslint/return-await
      result = await new Promise<object>((resolve, reject) => {
        this.handler(request, response, (err: unknown) => {
          if (err) reject(err);
          else {
            resolve(this.getFiles(request));
          }
        });
      });

      const savedReceipt = await this.dongRepo
        .receipts(dongId)
        .create({ userId: this.userId, fileName: _.get(result, 'fileName') });

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

  @del('/dongs/{dongId}/receipts', {
    summary: "Delete Dongs's receipts by dongId",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': { description: 'Dongs.Receipts DELETE success. No content' },
    },
  })
  async delete(@param.path.number('dongId') dongId: typeof Dongs.prototype.dongId) {
    try {
      const foundReceipt = await this.receiptRepo.findOne({
        fields: { fileName: true },
        where: { userId: this.userId, dongId: dongId },
      });

      if (foundReceipt) {
        await this.dongRepo.receipts(dongId).delete({ userId: this.userId });
        const filePath = this.getFilePath(foundReceipt.fileName);
        Fs.unlinkSync(filePath);
      }
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
        path: this.getFilePath(filename),
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
      fileName: f.filename,
      path: this.getFilePath(f.filename),
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

  private getFilePath(filename: string): string {
    return Path.join(this.storageDirectory, filename);
  }
}
