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
import { Dongs, PostDong, Categories } from '../models';
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
} from '../interceptors';
import { CategoriesSource, LocalizedMessages } from '../application';
import { dongReqBody } from './specs';

@model()
export class ResponseNewDong extends Dongs {
  @property({ type: 'number' }) score: number;
  @property() category: Categories;
}

intercept(FirebaseTokenInterceptor.BINDING_KEY);
@authenticate('jwt.access')
export class DongsController {
  private readonly userId: number;
  lang: string;

  constructor(
    @inject.context() public ctx: RequestContext,
    @service(DongService) public dongService: DongService,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
    @inject('application.categoriesSourceList') public catSrc: CategoriesSource,
    @repository(UsersRepository) public userRepo: UsersRepository,
    @repository(DongsRepository) public dongRepository: DongsRepository,
    @repository(BillListRepository) public billListRepository: BillListRepository,
    @repository(UsersRelsRepository) public usersRelsRepository: UsersRelsRepository,
    @repository(PayerListRepository) public payerListRepository: PayerListRepository,
    @repository(CategoriesRepository) public categoriesRepository: CategoriesRepository,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @patch('/dongs/{dongId}', {
    summary: 'Update Dongs description by dongId',
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
            exclude: [
              'dongId',
              'categoryId',
              'createdAt',
              'currency',
              'includeBill',
              'includeBudget',
              'jointAccountId',
              'originDongId',
              'userId',
              'title',
              'pong',
              'scores',
            ],
          }),
        },
      },
    })
    patchDong: Dongs,
  ) {
    try {
      const res = await this.userRepo.dongs(this.userId).patch(patchDong, { dongId: dongId });

      if (res.count === 0) {
        throw new Error(this.locMsg['DONG_NOT_VALID'][this.lang]);
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
              items: getModelSchemaRef(Dongs, {
                includeRelations: false,
                exclude: ['originDongId'],
              }),
            },
          },
        },
      },
    },
  })
  async findDongs(): Promise<Dongs[]> {
    return this.userRepo.dongs(this.userId).find({
      order: ['createdAt DESC'],
      fields: { originDongId: false },
      include: [{ relation: 'payerList' }, { relation: 'billList' }, { relation: 'category' }],
    });
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
    return this.dongService.createDongs(this.userId, newDong);
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
