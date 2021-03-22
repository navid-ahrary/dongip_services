/* eslint-disable prefer-const */
import { repository, property, model, CountSchema, DataObject } from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  post,
  requestBody,
  param,
  del,
  RequestContext,
  patch,
  HttpErrors,
} from '@loopback/rest';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject, service, intercept } from '@loopback/core';
import _ from 'lodash';
import { Dongs, PostDong, Categories, BillList, PayerList, Users, Receipts } from '../models';
import {
  UsersRepository,
  DongsRepository,
  BillListRepository,
  PayerListRepository,
  CategoriesRepository,
  UsersRelsRepository,
} from '../repositories';
import { DongService } from '../services';
import {
  ValidateCategoryIdInterceptor,
  JointAccountsInterceptor,
  FirebaseTokenInterceptor,
  ValidateDongIdInterceptor,
} from '../interceptors';
import { dongReqBody } from './specs';
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

intercept(FirebaseTokenInterceptor.BINDING_KEY);
@authenticate('jwt.access')
export class DongsController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(CategoriesSourceListBindings) public catSrc: CategoriesSource,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @service(DongService) public dongService: DongService,
    @repository(UsersRepository) public userRepo: UsersRepository,
    @repository(DongsRepository) public dongRepository: DongsRepository,
    @repository(BillListRepository) public billListRepository: BillListRepository,
    @repository(UsersRelsRepository) public usersRelsRepository: UsersRelsRepository,
    @repository(PayerListRepository) public payerListRepository: PayerListRepository,
    @repository(CategoriesRepository) public categoriesRepository: CategoriesRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @intercept(ValidateCategoryIdInterceptor.BINDING_KEY)
  @intercept(ValidateDongIdInterceptor.BINDING_KEY)
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

      if (_.values(patchBill).length) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dongRepository.billList(dongId).patch(patchBill);
      }

      if (_.values(patchPayer).length) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dongRepository.payerList(dongId).patch(patchPayer);
      }
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err.message);
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
              items: getModelSchemaRef(ResponseDongs, {
                includeRelations: false,
                exclude: ['originDongId'],
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

    _.forEach(foundDongs, (d) => {
      if (d.receipt instanceof Receipts) {
        _.assignIn(d, { receiptId: d.receipt.receiptId });
        _.unset(d, 'receipt');
      }

      result.push(d);
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
    @requestBody(dongReqBody) newDong: PostDong,
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
    return this.dongRepository.deleteById(dongId);
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
    return this.userRepo.dongs(this.userId).delete({ originDongId: null! });
  }
}
