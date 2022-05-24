/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable prefer-const */
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject, intercept, service } from '@loopback/core';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import { Count, CountSchema, DataObject, model, property, repository } from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import _ from 'lodash';
import {
  JointAccountsInterceptor,
  ValidateAccountIdInterceptor,
  ValidateCategoryIdInterceptor,
  ValidateDongIdInterceptor,
} from '../interceptors';
import {
  BillList,
  Categories,
  Dongs,
  PatchDongsDto,
  PayerList,
  PostDongDto,
  Users,
} from '../models';
import { CategoriesRepository, DongsRepository, UsersRepository } from '../repositories';
import { CurrentUserProfile, DongService } from '../services';
import { createDongReqBodySpec } from './specs';

@model()
export class ResponseNewDongDto extends Dongs {
  @property({ type: 'number' }) score: number;
  @property({ type: 'number' }) receiptId?: number;
  @property() category: Categories;
}

@model()
export class ResponseDongsDto extends Dongs {
  @property({ type: 'number' }) receiptId?: number;
}

@authenticate('jwt.access')
@intercept(ValidateCategoryIdInterceptor.BINDING_KEY, ValidateDongIdInterceptor.BINDING_KEY)
export class DongsController {
  private readonly userId: typeof Users.prototype.userId;

  constructor(
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @inject(SecurityBindings.USER) private currentUserProfile: CurrentUserProfile,
    @service(DongService) private dongService: DongService,
    @repository(UsersRepository) private userRepo: UsersRepository,
    @repository(DongsRepository) private dongRepository: DongsRepository,
    @repository(CategoriesRepository) private categoriesRepository: CategoriesRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
  }

  @intercept(ValidateAccountIdInterceptor.BINDING_KEY)
  @patch('/dongs/{dongId}', {
    summary: 'Update Dongs description and categoryId and accountId by dongId',
    description: 'Do not send notification to dong members, just update own Dong entity',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      204: { description: 'Succeed, not content' },
    },
  })
  async updateDongsById(
    @param.path.number('dongId', { required: true }) dongId: typeof Dongs.prototype.dongId,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(PatchDongsDto),
          example: {
            title: 'Just For Fun',
            desc: 'Just For Fun',
            categoryId: 123,
            pong: 15000,
            createdAt: new Date().toISOString(),
            includeBudget: false,
            accountId: 4,
            walletId: 23,
          },
        },
      },
    })
    patchDong: PatchDongsDto,
  ) {
    try {
      const patchPayload: Partial<Dongs> = {};

      if (patchDong.title) patchPayload.title = patchDong.title;
      if (patchDong.desc) patchPayload.desc = patchDong.desc;
      if (patchDong.categoryId) patchPayload.categoryId = patchDong.categoryId;
      if (patchDong.pong) patchPayload.pong = patchDong.pong;
      if (patchDong.includeBudget) patchPayload.includeBudget = patchDong.includeBudget;
      if (patchDong.accountId) patchPayload.accountId = patchDong.accountId;
      if (patchDong.walletId) patchPayload.walletId = patchDong.walletId;
      if (patchDong.createdAt) patchPayload.createdAt = patchDong.createdAt;

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.userRepo
        .dongs(this.userId)
        .patch(patchPayload, { dongId: dongId })
        .catch(err => {
          this.logger.log('error', err.messsage);
        });

      const patchBill = new BillList();
      const patchPayer = new PayerList();
      if (_.has(patchDong, 'categoryId')) {
        patchBill.categoryId = patchDong.categoryId!;
        patchPayer.categoryId = patchDong.categoryId!;
      }

      if (_.has(patchDong, 'pong')) {
        patchBill.dongAmount = patchDong.pong!;
        patchPayer.paidAmount = patchDong.pong!;
      }

      if (Object.values(patchBill).length) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dongRepository
          .billList(dongId)
          .patch(patchBill)
          .catch(err => {
            this.logger.log('error', err.messsage);
          });
      }

      if (Object.values(patchPayer).length) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dongRepository
          .payerList(dongId)
          .patch(patchPayer)
          .catch(err => {
            this.logger.log('error', err.messsage);
          });
      }
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  @patch('/dongs', {
    summary: 'Update bunch of Dongs by Where query',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        description: 'Successfully, Count Updated Entites',
        content: {
          'application/json': {
            schema: CountSchema,
          },
        },
      },
      422: { description: 'Unprocessable entity' },
    },
  })
  async patchDongs(
    @param.query.number('categoryId', { required: true, example: 12 }) categoryId: number,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              categoryId: { type: 'number' },
              accountId: { type: 'number' },
            },
          },
        },
      },
    })
    patchReqBody: Partial<Dongs>,
  ): Promise<Count> {
    try {
      await this.userRepo
        .categories(this.userId)
        .patch({ parentCategoryId: patchReqBody.categoryId }, { parentCategoryId: categoryId });

      await this.userRepo.billList(this.userId).patch(patchReqBody, { categoryId: categoryId });
      await this.userRepo.payerList(this.userId).patch(patchReqBody, { categoryId: categoryId });
      const updatedCount = await this.userRepo
        .dongs(this.userId)
        .patch(patchReqBody, { categoryId: categoryId });
      return updatedCount;
    } catch (err) {
      this.logger.log('error', err.message);
      throw new HttpErrors.NotImplemented(err.message);
    }
  }

  @get('/dongs/', {
    summary: 'Get array of all Dongs',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Dongs model instance',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(ResponseDongsDto, {
                includeRelations: false,
                exclude: ['originDongId', 'receipt'],
                optional: ['receiptId'],
              }),
            },
          },
        },
      },
    },
  })
  async findDongs(): Promise<DataObject<ResponseDongsDto>[]> {
    const result: DataObject<ResponseDongsDto>[] = [];
    const foundDongs = await this.userRepo.dongs(this.userId).find({
      order: ['createdAt DESC'],
      fields: { originDongId: false },
      where: { deleted: false },
      include: [
        { relation: 'payerList', scope: { where: { deleted: false } } },
        { relation: 'billList', scope: { where: { deleted: false } } },
        { relation: 'category', scope: { where: { deleted: false } } },
        { relation: 'receipt', scope: { where: { deleted: false } } },
      ],
    });

    foundDongs.forEach(d => {
      const r = {
        ..._.omit(d, 'receipt'),
        receiptId: d.receipt?.receiptId,
      };

      result.push(r);
    });

    return result;
  }

  @intercept(ValidateCategoryIdInterceptor.BINDING_KEY, ValidateAccountIdInterceptor.BINDING_KEY)
  @post('/dongs/', {
    summary: 'Create a new Dongs model instance',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        description: 'Dongs model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(ResponseNewDongDto, {
              includeRelations: false,
            }),
          },
        },
      },
      422: { description: 'Unprocessable entity' },
    },
  })
  async createDongs(
    @requestBody(createDongReqBodySpec) newDong: PostDongDto,
  ): Promise<DataObject<ResponseNewDongDto>> {
    // eslint-disable-next-line no-useless-catch
    try {
      newDong.accountId = newDong.accountId ?? this.currentUserProfile.primaryAccountId;
      const createdDong = await this.dongService.createDongs(this.userId, newDong);
      const foundCategory = await this.categoriesRepository.findOne({
        where: {
          categoryId: newDong.categoryId,
          userId: this.userId,
        },
      });

      const result: DataObject<ResponseNewDongDto> = {
        ...createdDong,
        category: foundCategory!,
        receiptId: newDong.receiptId,
      };

      return result;
    } catch (err) {
      this.logger.log('error', err.message);
      throw err;
    }
  }

  @intercept(JointAccountsInterceptor.BINDING_KEY)
  @del('/dongs/{dongId}', {
    summary: 'DELETE a Dong by dongId',
    security: OPERATION_SECURITY_SPEC,
    responses: { '204': { description: 'No content' } },
  })
  async deleteDongsById(
    @param.path.number('dongId', { required: true }) dongId: typeof Dongs.prototype.dongId,
  ): Promise<void> {
    try {
      await this.userRepo.scores(this.userId).patch({ deleted: true }, { dongId: dongId });
      await this.userRepo.billList(this.userId).patch({ deleted: true }, { dongId: dongId });
      await this.userRepo.payerList(this.userId).patch({ deleted: true }, { dongId: dongId });
      await this.userRepo.dongs(this.userId).patch({ deleted: true }, { dongId: dongId });
    } catch (err) {
      this.logger.log('error', err.message);
    }
  }

  @intercept(JointAccountsInterceptor.BINDING_KEY)
  @del('/dongs/', {
    summary: 'DELETE all Dongs ',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Count DELETE Dongs',
        content: {
          'application/json': {
            schema: CountSchema,
          },
        },
      },
    },
  })
  async deleteAllDongs() {
    try {
      await this.userRepo.scores(this.userId).patch({ deleted: true });
      await this.userRepo.billList(this.userId).patch({ deleted: true });
      await this.userRepo.payerList(this.userId).patch({ deleted: true });
      return await this.userRepo
        .dongs(this.userId)
        .patch({ deleted: true }, { originDongId: null! });
    } catch (err) {
      this.logger.log('error', err.message);
    }
  }
}
