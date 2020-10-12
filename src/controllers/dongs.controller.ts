/* eslint-disable prefer-const */
import {
  Filter,
  repository,
  property,
  model,
  CountSchema,
  DataObject,
} from '@loopback/repository';
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
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, service, intercept} from '@loopback/core';

import _ from 'lodash';
import util from 'util';
import moment from 'moment';

import {Dongs, PostNewDong, Notifications} from '../models';
import {
  UsersRepository,
  DongsRepository,
  BillListRepository,
  PayerListRepository,
  CategoriesRepository,
  UsersRelsRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {FirebaseService, BatchMessage, JointService, Joint} from '../services';
import {
  ValidateCategoryIdInterceptor,
  FirebasetokenInterceptor,
} from '../interceptors';
import {ValidateGroupIdInterceptor} from '../interceptors/validate-group-id.interceptor';
import {LocalizedMessages} from '../application';

@model()
class ResponseNewDong extends Dongs {
  @property({type: 'number'})
  score: number;
}
@intercept(
  ValidateGroupIdInterceptor.BINDING_KEY,
  FirebasetokenInterceptor.BINDING_KEY,
)
@api({basePath: '/', paths: {}})
@authenticate('jwt.access')
export class DongsController {
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(UsersRepository) protected usersRepo: UsersRepository,
    @repository(UsersRelsRepository)
    protected usersRelsRepo: UsersRelsRepository,
    @repository(DongsRepository) protected dongRepo: DongsRepository,
    @repository(CategoriesRepository)
    protected categoriesRepo: CategoriesRepository,
    @repository(PayerListRepository)
    protected payerListRepo: PayerListRepository,
    @repository(BillListRepository)
    protected billListRepo: BillListRepository,
    @service(FirebaseService) protected firebaseService: FirebaseService,
    @service(JointService) protected jointService: JointService,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @inject.context() protected ctx: RequestContext,
    @inject('application.localizedMessages')
    protected locMsg: LocalizedMessages,
  ) {
    this.userId = +this.currentUserProfile[securityId];
    this.lang = this.ctx.request.headers['accept-language'] ?? 'fa';
  }

  public numberWithCommas(x: number | string): string {
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
              items: getModelSchemaRef(Dongs, {includeRelations: false}),
            },
          },
        },
      },
    },
  })
  async findDongs(): Promise<Dongs[]> {
    const filter: Filter<Dongs> = {
      order: ['createdAt DESC'],
      include: [{relation: 'payerList'}, {relation: 'billList'}],
    };

    return this.usersRepo.dongs(this.userId).find(filter);
  }

  @intercept(ValidateCategoryIdInterceptor.BINDING_KEY)
  @post('/dongs/', {
    summary: 'Create a new Dongs model instance',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dongs model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(ResponseNewDong, {
              title: 'NewDongs',
              includeRelations: false,
            }),
          },
        },
      },
    },
  })
  async createDongs(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PostNewDong, {
            title: 'NewDongs',
            optional: [
              'title',
              'desc',
              'groupId',
              'currency',
              'jointAccountId',
            ],
          }),
          example: {
            title: 'New dong',
            desc: 'Dongip it',
            sendNotify: true,
            createdAt: moment.utc().toISOString(),
            categoryId: 12,
            groupId: 1,
            jointAccountId: 42,
            pong: 80000,
            currency: 'IRT',
            payerList: [{userRelId: 1, paidAmount: 80000}],
            billList: [
              {userRelId: 1, dongAmount: 20000},
              {userRelId: 2, dongAmount: 20000},
              {userRelId: 3, dongAmount: 20000},
              {userRelId: 4, dongAmount: 20000},
            ],
          },
        },
      },
    })
    newDong: Omit<PostNewDong, 'id'>,
  ): Promise<DataObject<ResponseNewDong>> {
    console.log(newDong);
    const newDongScore = 50;
    const mutualFriendScore = 20;

    let mutualFactor = 0;

    if (newDong.userId) delete newDong.userId;
    if (newDong.dongId) delete newDong.dongId;

    // Current user
    const currentUser = await this.usersRepo.findOne({
      where: {userId: this.userId},
      fields: {userId: true, phone: true, name: true},
    });
    const currentUserPhone = currentUser!.phone;

    let billList = newDong.billList,
      payerList = newDong.payerList,
      allUsersRelsIdList: {userRelId: number}[] = [],
      currentUserIsPayer: Boolean = false,
      firebaseMessagesList: BatchMessage = [];

    payerList.forEach((item) => {
      if (_.findIndex(allUsersRelsIdList, {userRelId: item.userRelId}) === -1) {
        allUsersRelsIdList.push({userRelId: item.userRelId});
      }
    });

    billList.forEach((item) => {
      if (_.findIndex(allUsersRelsIdList, {userRelId: item.userRelId}) === -1) {
        allUsersRelsIdList.push({userRelId: item.userRelId});
      }
    });

    // Validate userRelIds in billList and payerList
    const currentUserFoundUsersRelsList = await this.usersRepo
      .usersRels(this.userId)
      .find({
        where: {or: allUsersRelsIdList},
      });
    if (currentUserFoundUsersRelsList.length !== allUsersRelsIdList.length) {
      throw new HttpErrors.UnprocessableEntity(
        this.locMsg['SOME_USERS_RELS_NOT_VALID'][this.lang],
      );
    }

    // Check payer is user himself
    const userRel = await this.usersRepo.usersRels(this.userId).find({
      where: {and: [{userRelId: payerList[0].userRelId}, {type: 'self'}]},
    });
    if (userRel.length === 1) currentUserIsPayer = true;

    try {
      const createdDong = await this.usersRepo
        .dongs(this.userId)
        .create(
          _.pick(newDong, [
            'title',
            'createdAt',
            'categoryId',
            'desc',
            'pong',
            'currency',
            'groupId',
          ]),
        );

      payerList.forEach((item) => {
        item = _.assign(item, {
          userId: this.userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
          currency: createdDong.currency,
        });
      });

      billList.forEach((item) => {
        item = _.assign(item, {
          userId: this.userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
          currency: createdDong.currency,
        });
      });

      // Store billlists in database
      const createdPayerList = await this.payerListRepo.createAll(payerList);
      // Store payerLists in database
      const createdBillList = await this.billListRepo.createAll(billList);

      const currentUserCategory = await this.categoriesRepo.findById(
        newDong.categoryId,
        {fields: {title: true, icon: true}},
      );

      const sendNotify = _.has(newDong, 'sendNotify')
        ? newDong.sendNotify
        : true;

      if (currentUserIsPayer && sendNotify) {
        for (const relation of currentUserFoundUsersRelsList) {
          if (relation.type !== 'self') {
            const user = await this.usersRepo.findOne({
              where: {phone: relation.phone},
              include: [{relation: 'setting'}],
            });

            // If relation is mutual, add to notification reciever list
            if (user?.firebaseToken !== 'null') {
              const foundMutualUsersRels = await this.usersRelsRepo.findOne({
                where: {
                  phone: currentUserPhone,
                  userId: user!.getId(),
                },
              });

              if (foundMutualUsersRels) {
                // Increament scoreFactor for every mutual friend contribute in dong
                mutualFactor++;
                // Get rounded dong amount
                const roundedDongAmount = Math.floor(
                  _.find(billList, {
                    userRelId: relation.getId(),
                  })!.dongAmount,
                );

                // Seperate thousands with "," for use in notification body
                const notifyBodyDongAmount = this.numberWithCommas(
                  roundedDongAmount,
                );

                // Notification data payload
                const notifyData = new Notifications({
                  title: this.locMsg['DONGIP_NOTIFY_TITLE'][
                    user!.setting.language
                  ],
                  body: util.format(
                    this.locMsg['DONGIP_NOTIFY_BODY'][user!.setting.language],
                    notifyBodyDongAmount,
                    this.locMsg['CURRENCY'][user!.setting.language][
                      createdDong.currency
                    ],
                    foundMutualUsersRels.name,
                  ),
                  desc: createdDong.desc ? createdDong.desc : '',
                  type: 'dong',
                  categoryTitle: currentUserCategory.title,
                  categoryIcon: currentUserCategory.icon,
                  createdAt: newDong.createdAt,
                  userRelId: foundMutualUsersRels.getId(),
                  dongAmount: roundedDongAmount,
                  currency: newDong.currency,
                  dongId: createdDong.getId(),
                });

                const createdNotify = await this.usersRepo
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
        }

        // send notification to friends
        if (firebaseMessagesList.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.firebaseService.sendAllMessage(firebaseMessagesList);
        }
      }

      const calculatedScore = newDongScore + mutualFactor * mutualFriendScore;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepo.scores(this.userId).create({
        dongId: createdDong.getId(),
        score: calculatedScore,
      });

      createdDong.billList = createdBillList;
      createdDong.payerList = createdPayerList;

      if (newDong.jointAccountId) {
        const selfRel = await this.usersRelsRepo.findOne({
          fields: {userRelId: true, userId: true},
        });

        if (_.findIndex(billList, {userRelId: selfRel?.getId()}) > -1) {
          const userBill = _.find(createdBillList, {
            userRelId: selfRel?.getId(),
          });

          const data: Joint = {
            dongId: createdDong.getId(),
            createdAt: createdDong.createdAt,
            currency: createdDong.currency,
            desc: createdDong.desc,
            title: createdDong.title,
            dongAmount: userBill!.dongAmount,
            categoryTitle: currentUserCategory.title,
            categoryIcon: currentUserCategory.icon,
            billListId: userBill!.getId(),
          };
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.jointService
            .submit(this.userId, newDong.jointAccountId, data)
            .then(async () => {
              await this.billListRepo.updateById(userBill!.billListId!, {
                jointAccountId: newDong.jointAccountId,
              });
            });
        }
      }

      return {
        ...createdDong,
        score: calculatedScore,
      };
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err);
    }
  }

  @del('/dongs/{dongId}', {
    summary: 'DELETE a Dong by dongId',
    security: OPERATION_SECURITY_SPEC,
    responses: {'204': {description: 'No content'}},
  })
  async deleteDongsById(
    @param.path.number('dongId', {required: true})
    dongId: typeof Dongs.prototype.dongId,
  ): Promise<void> {
    // Delete Dong by dongId
    const countDeleted = await this.usersRepo.dongs(this.userId).delete({
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
    return this.usersRepo.dongs(this.userId).delete();
  }
}
