import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
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
import { Count, CountSchema, repository, Where } from '@loopback/repository';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { authenticate } from '@loopback/authentication';
import Path from 'path';
import _ from 'lodash';
import { FileUploadHandler } from '../types';
import { Dongs, Receiptions, Users } from '../models';
import { DongsRepository } from '../repositories';
import { FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY_BINDING } from '../keys';
import { ValidateDongIdInterceptor } from '../interceptors';

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
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @inject(STORAGE_DIRECTORY_BINDING) private storageDirectory: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @repository(DongsRepository) public dongRepo: DongsRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @get('/dongs/{dongId}/receiptions', {
    responses: {
      '200': {
        description: 'Array of Dongs has many Receiptions',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Receiptions) },
          },
        },
      },
    },
  })
  @oas.response.file()
  async findDongsReceiptions(
    @param.path.number('dongId') dongId: typeof Dongs.prototype.dongId,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<Receiptions[]> {
    return this.dongRepo.receiptions(dongId).find();
  }

  @post('/dongs/{dongId}/receiptions', {
    summary: "Upload Dongs's receiptions",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
        description: 'File',
      },
    },
  })
  async uploadDongReceiption(
    @param.path.number('dongId') dongId: typeof Dongs.prototype.dongId,
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<object> {
    try {
      // eslint-disable-next-line @typescript-eslint/return-await
      const result = await new Promise<object>((resolve, reject) => {
        this.handler(request, response, (err: unknown) => {
          if (err) reject(err);
          else {
            resolve(DongsReceiptionsController.getFilesAndFields(request));
          }
        });
      });

      return result;
    } catch (err) {
      console.error(JSON.stringify(err));

      if (err.code === 'LIMIT_FILE_SIZE') {
        throw new HttpErrors.PayloadTooLarge(err.message);
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        throw new HttpErrors.UnsupportedMediaType('');
      } else {
        throw new HttpErrors.UnprocessableEntity(err.message);
      }
    }
  }

  @del('/dongs/{dongId}/receiptions', {
    responses: {
      '200': {
        description: 'Dongs.Receiptions DELETE success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async delete(
    @param.path.number('dongId') dongId: typeof Dongs.prototype.dongId,
    @param.query.object('where', getWhereSchemaFor(Receiptions)) where?: Where<Receiptions>,
  ): Promise<Count> {
    return this.dongRepo.receiptions(dongId).delete(where);
  }

  /**
   * Validate file names to prevent them goes beyond the designated directory
   * @param fileName - File name
   */
  private validateFileName(fileName: string) {
    const resolved = Path.resolve(this.storageDirectory, fileName);
    if (resolved.startsWith(this.storageDirectory)) return resolved;
    // The resolved file is outside sandbox
    throw new HttpErrors.BadRequest(`Invalid file name: ${fileName}`);
  }

  /**
   * Get files and fields for the request
   * @param request - Http request
   */
  private static getFilesAndFields(request: Request) {
    const uploadedFiles = request.files;

    const mapper = (f: globalThis.Express.Multer.File) => ({
      fieldname: f.fieldname,
      // originalname: f.originalname,
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
    });

    let files: object[] = [];

    if (_.isArray(uploadedFiles)) {
      files = uploadedFiles.map(mapper);
    } else {
      for (const filename in uploadedFiles) {
        files.push(...uploadedFiles[filename].map(mapper));
      }
    }
    return { files, fields: request.body };
  }
}
