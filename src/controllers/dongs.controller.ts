/* eslint-disable prefer-const */
import { repository, property, model, CountSchema, DataObject, Count } from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  post,
  requestBody,
  param,
  del,
  patch,
  HttpErrors,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject, service, intercept } from '@loopback/core';
import _ from 'lodash';
import { Dongs, PostDong, Categories, BillList, PayerList, Users } from '../models';
import {
  UsersRepository,
  DongsRepository,
  BillListRepository,
  PayerListRepository,
  CategoriesRepository,
  UsersRelsRepository,
} from '../repositories';
import { CurrentUserProfile, DongService } from '../services';
import {
  ValidateCategoryIdInterceptor,
  JointAccountsInterceptor,
  ValidateDongIdInterceptor,
} from '../interceptors';
import { createDongReqBodySpec } from './specs';
import { CategoriesSource, LocalizedMessages } from '../types';
import { CategoriesSourceListBindings, LocMsgsBindings } from '../keys';

@model()
export class ResponseNewDong extends Dongs {
  @property({ type: 'number' }) score: number;
  @property({ type: 'number' }) receiptId?: number;
  @property() category: Categories;
}

@model()
export class ResponseDongs extends Dongs {
  @property({ type: 'number' }) receiptId?: number;
}

@authenticate('jwt.access')
@intercept(ValidateCategoryIdInterceptor.BINDING_KEY, ValidateDongIdInterceptor.BINDING_KEY)
export class DongsController {
  private readonly userId: typeof Users.prototype.userId;

  constructor(
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(CategoriesSourceListBindings) public catSrc: CategoriesSource,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @service(DongService) public dongService: DongService,
    @repository(UsersRepository) public userRepo: UsersRepository,
    @repository(DongsRepository) public dongRepository: DongsRepository,
    @repository(BillListRepository) public billListRepository: BillListRepository,
    @repository(UsersRelsRepository) public usersRelsRepository: UsersRelsRepository,
    @repository(PayerListRepository) public payerListRepository: PayerListRepository,
    @repository(CategoriesRepository) public categoriesRepository: CategoriesRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
  }

  @patch('/dongs/{dongId}', {
    summary: 'Update Dongs description and categoryId by dongId',
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
          schema: getModelSchemaRef(Dongs, {
            partial: true,
            exclude: [
              'dongId',
              'currency',
              'includeBill',
              'jointAccountId',
              'originDongId',
              'userId',
              'scores',
              'income',
              'walletId',
            ],
          }),
          example: {
            title: 'Just For Fun',
            desc: 'Just For Fun',
            categoryId: 123,
            pong: 15000,
            createdAt: new Date().toISOString(),
            includeBudget: false,
          },
        },
      },
    })
    patchDong: Dongs,
  ) {
    try {
      await this.userRepo.dongs(this.userId).patch(patchDong, { dongId: dongId });

      const patchBill = new BillList();
      const patchPayer = new PayerList();
      if (_.has(patchDong, 'categoryId')) {
        patchBill.categoryId = patchDong.categoryId;
        patchPayer.categoryId = patchDong.categoryId;
      }

      if (_.has(patchDong, 'pong')) {
        patchBill.dongAmount = patchDong.pong;
        patchPayer.paidAmount = patchDong.pong;
      }

      if (Object.values(patchBill).length) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dongRepository.billList(dongId).patch(patchBill);
      }

      if (Object.values(patchPayer).length) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dongRepository.payerList(dongId).patch(patchPayer);
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
            properties: { categoryId: { type: 'number' } },
            example: { categoryId: 202 },
          },
        },
      },
    })
    patchReqBody: Partial<Dongs>,
  ): Promise<Count> {
    await this.userRepo
      .categories(this.userId)
      .patch({ parentCategoryId: patchReqBody.categoryId }, { parentCategoryId: categoryId });

    await this.userRepo.billList(this.userId).patch(patchReqBody, { categoryId: categoryId });
    await this.userRepo.payerList(this.userId).patch(patchReqBody, { categoryId: categoryId });
    return this.userRepo.dongs(this.userId).patch(patchReqBody, { categoryId: categoryId });
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
              items: getModelSchemaRef(ResponseDongs, {
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
  async findDongs(): Promise<DataObject<ResponseDongs>[]> {
    const result: DataObject<ResponseDongs>[] = [];
    const foundDongs = await this.userRepo.dongs(this.userId).find({
      order: ['createdAt DESC'],
      fields: { originDongId: false },
      include: [
        { relation: 'payerList' },
        { relation: 'billList' },
        { relation: 'category' },
        { relation: 'receipt' },
      ],
    });

    foundDongs.forEach((d) => {
      const r = {
        ..._.omit(d, 'receipt'),
        receiptId: d.receipt?.receiptId,
      };

      result.push(r);
    });

    return result;
  }

  @intercept(ValidateCategoryIdInterceptor.BINDING_KEY)
  @post('/dongs/', {
    summary: 'Create a new Dongs model instance',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      200: {
        description: 'Dongs model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(ResponseNewDong, {
              includeRelations: false,
            }),
          },
        },
      },
      422: { description: 'Unprocessable entity' },
    },
  })
  async createDongs(
    @requestBody(createDongReqBodySpec) newDong: PostDong,
  ): Promise<DataObject<ResponseNewDong>> {
    // eslint-disable-next-line no-useless-catch
    try {
      const createdDong = await this.dongService.createDongs(this.userId, newDong);
      const foundCategory = await this.categoriesRepository.findOne({
        where: { categoryId: newDong.categoryId, userId: this.userId },
      });

      const result: DataObject<ResponseNewDong> = {
        ...createdDong,
        category: foundCategory!,
        receiptId: newDong.receiptId,
      };

      return result;
    } catch (err) {
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
    await this.userRepo.scores(this.userId).patch({ deleted: true }, { dongId: dongId });
    await this.userRepo.dongs(this.userId).patch({ deleted: true }, { dongId: dongId });
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
    await this.userRepo.scores(this.userId).patch({ deleted: true });
    return this.userRepo.dongs(this.userId).patch({ deleted: true }, { originDongId: null! });
  }
}
