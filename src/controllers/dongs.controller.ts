/* eslint-disable prefer-const */
import { repository, property, model, CountSchema, DataObject } from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  post,
  requestBody,
  HttpErrors,
  api,
  param,
  del,
  RequestContext,
} from '@loopback/rest';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
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
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs';
import { FirebaseService, BatchMessage } from '../services';
import {
  ValidateGroupIdInterceptor,
  ValidateCategoryIdInterceptor,
  FirebasetokenInterceptor,
} from '../interceptors';
import { LocalizedMessages } from '../application';

@model()
class ResponseNewDong extends Dongs {
  @property({ type: 'number' })
  score: number;
}
@intercept(ValidateGroupIdInterceptor.BINDING_KEY, FirebasetokenInterceptor.BINDING_KEY)
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
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
    @inject.context() public ctx: RequestContext,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = this.ctx.request.headers['accept-language'] ?? 'fa';
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
              items: getModelSchemaRef(Dongs, { includeRelations: false }),
            },
          },
        },
      },
    },
  })
  async findDongs(): Promise<Dongs[]> {
    return this.usersRepository.dongs(this.userId).find({
      order: ['createdAt DESC'],
      include: [{ relation: 'payerList' }, { relation: 'billList' }],
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
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PostDong, {
            title: 'NewDongs',
            optional: ['title', 'desc', 'groupId', 'jointAccountId', 'currency'],
          }),
          example: {
            title: 'New dong',
            desc: 'Dongip it',
            createdAt: moment.utc().toISOString(),
            categoryId: 1,
            jointAccountId: 1,
            pong: 80000,
            currency: 'IRR',
            sendNotify: true,
            payerList: [{ userRelId: 1, paidAmount: 80000 }],
            billList: [
              { userRelId: 1, dongAmount: 20000 },
              { userRelId: 2, dongAmount: 20000 },
              { userRelId: 3, dongAmount: 20000 },
              { userRelId: 4, dongAmount: 20000 },
            ],
          },
        },
      },
    })
    newDong: PostDong,
  ): Promise<DataObject<ResponseNewDong>> {
    const newDongScore = 50;
    const mutualFriendScore = 20;

    let mutualFactor = 0;

    delete newDong?.userId;
    delete newDong?.dongId;

    let billList = newDong.billList,
      payerList = newDong.payerList,
      allUsersRelsIdList: number[] = [],
      currentUserIsPayer: Boolean = false,
      firebaseMessagesList: BatchMessage = [];

    payerList.forEach((item) => {
      if (!allUsersRelsIdList.includes(item.userRelId)) {
        allUsersRelsIdList.push(item.userRelId);
      }
    });

    billList.forEach((item) => {
      if (!allUsersRelsIdList.includes(item.userRelId)) {
        allUsersRelsIdList.push(item.userRelId);
      }
    });

    const currentUser = await this.usersRepository.findById(this.userId, {
      fields: {
        userId: true,
        phone: true,
        name: true,
        jointAccounts: true,
        usersRels: true,
        categories: true,
      },
      include: [
        {
          relation: 'categories',
          scope: {
            where: { categoryId: newDong.categoryId },
          },
        },
        {
          relation: 'usersRels',
          scope: {
            fields: { userRelId: true, userId: true, phone: true, type: true },
            where: {
              userRelId: { inq: allUsersRelsIdList },
            },
          },
        },
        {
          relation: 'jointAccountSubscribes',
          scope: {
            where: { jointAccountId: newDong.jointAccountId ?? null },
          },
        },
      ],
    });

    const usersRels = currentUser.usersRels;
    const exterUserRelsList = _.filter(usersRels, (ur) => ur.type !== 'self');
    const selfUserRel = _.find(usersRels, (ur) => ur.type === 'self');

    if (usersRels?.length !== allUsersRelsIdList.length) {
      throw new HttpErrors.UnprocessableEntity(this.locMsg['SOME_USERS_RELS_NOT_VALID'][this.lang]);
    }

    if (selfUserRel?.getId() === newDong.payerList[0].userRelId) {
      currentUserIsPayer = true;
    }

    // Create a Dongs objcet
    const dong = new Dongs({
      title: newDong.title,
      createdAt: newDong.createdAt,
      categoryId: newDong.categoryId,
      desc: newDong.desc,
      pong: newDong.pong,
      currency: newDong.currency,
      groupId: newDong.groupId,
      jointAccountId: newDong.jointAccountId ?? undefined,
    });

    try {
      const createdDong = await this.usersRepository.dongs(this.userId).create(dong);

      payerList.forEach((item) => {
        item = _.assign(item, {
          userId: this.userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
          currency: createdDong.currency,
          jointAccountId: createdDong.jointAccountId,
        });
      });

      billList.forEach((item) => {
        item = _.assign(item, {
          userId: this.userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
          currency: createdDong.currency,
          jointAccountId: createdDong.jointAccountId,
        });
      });

      const createdPayerList = await this.payerListRepository.createAll(payerList);
      const createdBillList = await this.billListRepository.createAll(billList);

      createdDong.billList = createdBillList;
      createdDong.payerList = createdPayerList;

      const sendNotify = _.has(newDong, 'sendNotify') ? newDong.sendNotify : true;

      if (!currentUser.jointAccountSubscribes && currentUserIsPayer && sendNotify) {
        for (const relation of exterUserRelsList) {
          const user = await this.usersRepository.findOne({
            where: { phone: relation.phone },
            include: [{ relation: 'setting' }],
          });

          // If relation is mutual, add to notification reciever list
          if (user?.firebaseToken !== 'null') {
            const foundMutualUsersRels = await this.usersRelsRepository.findOne({
              where: {
                phone: currentUser.phone,
                userId: user!.getId(),
              },
            });

            if (foundMutualUsersRels) {
              // Increament scoreFactor for every mutual friend contribute in dong
              mutualFactor++;
              // Get rounded dong amount
              const roundedDongAmount = _.find(billList, {
                userRelId: relation.getId(),
              })
                ? Math.floor(_.find(billList, { userRelId: relation.getId() })!.dongAmount)
                : 0;

              // Seperate thousands with "," for use in notification body
              const notifyBodyDongAmount = this.numberWithCommas(roundedDongAmount);

              // Notification data payload
              const notifyData = new Notifications({
                title: this.locMsg['DONGIP_NOTIFY_TITLE'][user!.setting.language],
                body: util.format(
                  this.locMsg['DONGIP_NOTIFY_BODY'][user!.setting.language],
                  notifyBodyDongAmount,
                  this.locMsg['CURRENCY'][user!.setting.language][createdDong.currency],
                  foundMutualUsersRels.name,
                ),
                desc: createdDong.desc ?? '',
                type: 'dong',
                categoryTitle: currentUser.categories[0].title,
                categoryIcon: currentUser.categories[0].icon,
                createdAt: moment(createdDong.createdAt).utc().toISOString(),
                userRelId: foundMutualUsersRels.getId(),
                dongAmount: roundedDongAmount,
                currency: createdDong.currency,
                dongId: createdDong.getId(),
              });

              const createdNotify = await this.usersRepository
                .notifications(user!.getId())
                .create(notifyData);

              // Generate notification messages
              firebaseMessagesList.push({
                token: user!.firebaseToken!,
                notification: {
                  title: notifyData.title,
                  body: notifyData.body,
                },
                data: {
                  notifyId: createdNotify.getId().toString(),
                  title: notifyData.title!,
                  body: notifyData.body!,
                  desc: notifyData.desc!,
                  type: notifyData.type!,
                  categoryTitle: notifyData.categoryTitle!,
                  categoryIcon: notifyData.categoryIcon!,
                  createdAt: notifyData.createdAt!,
                  userRelId: notifyData.userRelId!.toString(),
                  dongAmount: notifyData.dongAmount!.toString(),
                  currency: createdNotify.currency!,
                  dongId: notifyData.dongId!.toString(),
                },
              });
            }
          }
        }

        if (firebaseMessagesList.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.firebaseSerice.sendAllMessage(firebaseMessagesList);
        }
      } else if (currentUser.jointAccountSubscribes && sendNotify) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.submitJoint(currentUser, createdDong);
      }

      const calculatedScore = newDongScore + mutualFactor * mutualFriendScore;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.scores(this.userId).create({
        dongId: createdDong.getId(),
        score: calculatedScore,
      });

      return {
        ...createdDong,
        score: calculatedScore,
      };
    } catch (err) {
      console.error(err);
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  @del('/dongs/{dongId}', {
    summary: 'DELETE a Dong by dongId',
    security: OPERATION_SECURITY_SPEC,
    responses: { '204': { description: 'No content' } },
  })
  async deleteDongsById(
    @param.path.number('dongId', { required: true }) dongId: typeof Dongs.prototype.dongId,
  ): Promise<void> {
    const countDeleted = await this.usersRepository.dongs(this.userId).delete({
      dongId: dongId,
    });

    if (countDeleted.count !== 1) {
      const errMsg = this.locMsg['DONG_NOT_VALID'][this.lang];
      throw new HttpErrors.UnprocessableEntity(errMsg);
    }
  }

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
    return this.usersRepository.dongs(this.userId).delete();
  }

  async submitJoint(currentUser: Users, dong: Partial<Dongs>) {
    try {
      const savedDong = _.assign({}, dong);
      const firebaseMessages: BatchMessage = [];

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
      const splittedCatgTitle = currentUserCateg.title
        .split(' ')
        .filter((v) => !['and', 'or', '&', ',', '.', ';', 'و', 'یا', '،', '-'].includes(v));

      for (const JAS of JASs) {
        const user = await this.usersRepository.findById(JAS.userId, {
          fields: { userId: true, firebaseToken: true },
          include: [
            { relation: 'setting', scope: { fields: { userId: true, language: true } } },
            {
              relation: 'categories',
              scope: {
                limit: 1,
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
          const relName = await this.usersRelsRepository.findOne({
            fields: { userRelId: true, name: true, userId: true, type: true },
            where: { userId: biller.userId },
          });

          billers.push(
            new BillList({
              dongId: createdDong.getId(),
              userId: user.getId(),
              currency: savedDong.currency,
              categoryId: catg.getId(),
              createdAt: savedDong.createdAt,
              dongAmount: biller.dongAmount,
              jointAccountId: savedDong.jointAccountId,
              userRelName: relName!.name ?? user.usersRels[0].name,
            }),
          );
        }

        const payers: Array<PayerList> = [];
        for (const payer of payerList) {
          const relName = await this.usersRelsRepository.findOne({
            fields: { userRelId: true, name: true },
            where: { userRelId: payer.userRelId },
          });

          payers.push(
            new PayerList({
              dongId: createdDong.getId(),
              userId: user.getId(),
              currency: savedDong.currency,
              categoryId: catg.getId(),
              createdAt: savedDong.createdAt,
              paidAmount: payer.paidAmount,
              jointAccountId: savedDong.jointAccountId,
              userRelName: relName!.name ?? user.usersRels[0].name,
            }),
          );
        }

        const createdPayers = await this.payerListRepository.createAll(payers);
        createdDong.payerList = createdPayers;
        const createdBills = await this.billListRepository.createAll(billers);
        createdDong.billList = createdBills;

        const firebaseToken = user.firebaseToken!;
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
            dong: JSON.stringify(createdDong),
            createdAt: moment(notifyData.createdAt).toISOString(),
            silent: 'true',
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
}
