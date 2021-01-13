/* eslint-disable prefer-const */
import { repository, property, model, CountSchema, DataObject } from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  post,
  requestBody,
  api,
  param,
  del,
  RequestContext,
} from '@loopback/rest';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { inject, service, intercept } from '@loopback/core';
import _ from 'lodash';
import util from 'util';
import moment from 'moment';

import { Dongs, PostDong, Notifications, Users, Categories, PayerList, BillList } from '../models';
import {
  UsersRepository,
  DongsRepository,
  BillListRepository,
  PayerListRepository,
  CategoriesRepository,
  UsersRelsRepository,
  JointAccountsRepository,
  JointAccountSubscribesRepository,
} from '../repositories';
import { FirebaseService, BatchMessage, DongService } from '../services';
import {
  ValidateCategoryIdInterceptor,
  FirebasetokenInterceptor,
  JointAccountsInterceptor,
} from '../interceptors';
import { CategoriesSource, LocalizedMessages } from '../application';
import { dongReqBody } from './specs';

@model()
export class ResponseNewDong extends Dongs {
  @property({ type: 'number' })
  score: number;

  @property() category: Categories;
}

@intercept(FirebasetokenInterceptor.BINDING_KEY)
@api({ basePath: '/', paths: {} })
@authenticate('jwt.access')
export class DongsController {
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(UsersRelsRepository) public usersRelsRepository: UsersRelsRepository,
    @repository(DongsRepository) public dongRepository: DongsRepository,
    @repository(CategoriesRepository) public categoriesRepository: CategoriesRepository,
    @repository(PayerListRepository) public payerListRepository: PayerListRepository,
    @repository(BillListRepository) public billListRepository: BillListRepository,
    @repository(JointAccountsRepository) public jointAccRepository: JointAccountsRepository,
    @repository(JointAccountSubscribesRepository)
    public jointAccSunRepository: JointAccountSubscribesRepository,
    @service(FirebaseService) private firebaseSerice: FirebaseService,
    @service(DongService) public dongService: DongService,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
    @inject('application.categoriesSourceList') public catSrc: CategoriesSource,
    @inject.context() public ctx: RequestContext,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  public numberWithCommas(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
    return this.usersRepository.dongs(this.userId).find({
      fields: { originDongId: false },
      order: ['createdAt DESC'],
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

  async submitJoint(currentUser: Users, dong: Partial<Dongs>) {
    try {
      const firebaseMessages: BatchMessage = [];

      const savedDong = _.assign({}, { ...dong, originDongId: dong.dongId });
      const billList = savedDong.billList!;
      const payerList = savedDong.payerList!;

      delete savedDong.billList;
      delete savedDong.payerList;
      delete savedDong.userId;
      delete savedDong.dongId;

      const JA = await this.jointAccRepository.findById(
        currentUser.jointAccountSubscribes[0].jointAccountId,
      );
      const JASs = await this.jointAccSunRepository.find({
        where: { userId: { neq: currentUser.getId() }, jointAccountId: JA.getId() },
      });

      const currentUserCateg = currentUser.categories[0];
      const catsFa = this.catSrc['fa'];
      const catsEn = this.catSrc['en'];
      let splittedCatgTitle: string[] = [];
      const cFa = _.find(catsFa, (c) => c.title === currentUserCateg.title);
      if (cFa) {
        const titleEn = _.find(catsEn, (c) => c.id === cFa.id)?.title ?? '';
        splittedCatgTitle.push(titleEn);
      }
      const cEn = _.find(catsEn, (c) => c.title === currentUserCateg.title);
      if (cEn) {
        const titleFa = _.find(catsFa, (c) => c.id === cEn.id)?.title ?? '';
        splittedCatgTitle.push(titleFa);
      }
      splittedCatgTitle = _.concat(
        splittedCatgTitle,
        currentUserCateg.title
          .split(' ')
          .filter((v) => !['and', 'or', '&', ',', '.', ';', 'و', 'یا', '،', '-'].includes(v)),
      );

      for (const JAS of JASs) {
        const user = await this.usersRepository.findById(JAS.userId, {
          fields: { userId: true, firebaseToken: true, name: true },
          include: [
            { relation: 'setting', scope: { fields: { userId: true, language: true } } },
            {
              relation: 'categories',
              scope: {
                where: {
                  or: [{ title: currentUserCateg.title }, { title: { inq: splittedCatgTitle } }],
                },
              },
            },
            { relation: 'usersRels', scope: { where: { phone: currentUser.phone } } },
          ],
        });

        let catg: Categories;
        if (user.categories) {
          catg = user.categories[0];
        } else {
          catg = await this.categoriesRepository.create({
            userId: user.getId(),
            title: currentUserCateg.title,
            icon: currentUserCateg.icon,
          });
        }

        savedDong.categoryId = catg.getId();

        const createdDong = await this.usersRepository.dongs(user.getId()).create(savedDong);

        const billers: Array<BillList> = [];
        for (const biller of billList) {
          const ur = _.find(currentUser.usersRels, (rel) => rel.getId() === biller.userRelId);

          const mutualRel = await this.usersRelsRepository.findOne({
            where: { userId: user.getId(), phone: ur!.phone },
          });

          let userRelName = mutualRel?.name;
          if (!userRelName) {
            const target = await this.usersRepository.findOne({
              where: { phone: ur!.phone },
              fields: { name: true },
            });

            userRelName = target?.name;
          }

          billers.push(
            new BillList({
              dongId: createdDong.getId(),
              userId: user.getId(),
              currency: savedDong.currency,
              categoryId: catg.getId(),
              createdAt: savedDong.createdAt,
              dongAmount: biller.dongAmount,
              jointAccountId: savedDong.jointAccountId,
              userRelName: userRelName,
              userRelId: mutualRel?.getId(),
            }),
          );
        }

        const payers: Array<PayerList> = [];
        for (const payer of payerList) {
          const ur = _.find(currentUser.usersRels, (rel) => rel.getId() === payer.userRelId);

          const mutualRel = await this.usersRelsRepository.findOne({
            where: { userId: user.getId(), phone: ur?.phone },
          });

          let userRelName = mutualRel?.name;
          if (!userRelName) {
            const target = await this.usersRepository.findOne({
              where: { phone: ur!.phone },
              fields: { name: true },
            });

            userRelName = target?.name;
          }

          payers.push(
            new PayerList({
              dongId: createdDong.getId(),
              userId: user.getId(),
              currency: savedDong.currency,
              categoryId: catg.getId(),
              createdAt: savedDong.createdAt,
              paidAmount: payer.paidAmount,
              jointAccountId: savedDong.jointAccountId,
              userRelName: userRelName,
              userRelId: mutualRel?.getId(),
            }),
          );
        }

        const createdPayers = await this.payerListRepository.createAll(payers);
        createdDong.payerList = createdPayers;
        const createdBills = await this.billListRepository.createAll(billers);
        createdDong.billList = createdBills;

        const firebaseToken = user.firebaseToken ?? ' ';
        const lang = user.setting.language;

        const notifyData = new Notifications({
          title: util.format(this.locMsg['DONGIP_IN_GROUP_NOTIFY_TITLE'][lang], JA.title),
          body: util.format(
            this.locMsg['DONGIP_IN_GROUP_NOTIFY_BODY'][lang],
            this.numberWithCommas(createdDong.pong!),
            this.locMsg['CURRENCY'][lang][createdDong.currency!],
            user.usersRels[0].name,
          ),
          type: 'dong-jointAccount',
          categoryTitle: catg.title,
          categoryIcon: catg.icon,
          dongId: createdDong.dongId,
          userRelId: user.usersRels[0].getId(),
          createdAt: createdDong.createdAt,
          jointAccountId: createdDong.jointAccountId,
        });

        const createdNotify = await this.usersRepository
          .notifications(user.getId())
          .create(notifyData);

        firebaseMessages.push({
          token: firebaseToken,
          notification: {
            title: notifyData.title,
            body: notifyData.body,
          },
          data: {
            notifyId: createdNotify.getId().toString(),
            dongId: notifyData.dongId!.toString(),
            jointAccountId: JA.getId().toString(),
            title: notifyData.title!,
            body: notifyData.body!,
            desc: notifyData.desc ?? '',
            type: notifyData.type!,
            categoryId: catg.getId().toString(),
            categoryTitle: notifyData.categoryTitle!,
            categoryIcon: notifyData.categoryIcon!,
            userRelId: notifyData.userRelId!.toString(),
            createdAt: moment(notifyData.createdAt).toISOString(),
            silent: 'false',
          },
        });
      }

      if (firebaseMessages.length) {
        await this.firebaseSerice.sendAllMessage(firebaseMessages);
      }
    } catch (err) {
      console.error(err);
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
    return this.usersRepository.dongs(this.userId).delete({ originDongId: null! });
  }
}
