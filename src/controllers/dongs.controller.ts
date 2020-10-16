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

import {Dongs, PostDong, Notifications} from '../models';
import {
  UsersRepository,
  DongsRepository,
  BillListRepository,
  PayerListRepository,
  CategoriesRepository,
  UsersRelsRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {FirebaseService, BatchMessage, Joint, JointService} from '../services';
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
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @repository(DongsRepository) public dongRepository: DongsRepository,
    @repository(CategoriesRepository)
    public categoriesRepository: CategoriesRepository,
    @repository(PayerListRepository)
    public payerListRepository: PayerListRepository,
    @repository(BillListRepository)
    public billListRepository: BillListRepository,
    @service(FirebaseService) private firebaseSerice: FirebaseService,
    @service(JointService) protected jointService: JointService,
    @inject(SecurityBindings.USER)
    private currentUserProfile: UserProfile,
    @inject.context() public ctx: RequestContext,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
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

    return this.usersRepository.dongs(this.userId).find(filter);
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
          schema: getModelSchemaRef(PostDong, {
            title: 'NewDongs',
            optional: [
              'title',
              'desc',
              'groupId',
              'jointAccountId',
              'currency',
            ],
          }),
          example: {
            title: 'New dong',
            desc: 'Dongip it',
            createdAt: moment.utc().toISOString(),
            categoryId: 1,
            groupId: 12,
            pong: 80000,
            currency: 'IRR',
            sendNotify: true,
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
    newDong: PostDong,
  ): Promise<DataObject<ResponseNewDong>> {
    const newDongScore = 50;
    const mutualFriendScore = 20;

    let mutualFactor = 0;

    if (newDong.userId) delete newDong.userId;
    if (newDong.dongId) delete newDong.dongId;

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
      },
      include: [
        {
          relation: 'categories',
          scope: {
            where: {categoryId: newDong.categoryId},
          },
        },
        {
          relation: 'usersRels',
          scope: {
            fields: {userRelId: true, userId: true, phone: true, type: true},
            where: {
              or: [{type: 'self'}, {userRelId: {inq: allUsersRelsIdList}}],
            },
          },
        },
        {
          relation: 'jointAccounts',
          scope: {
            fields: {createdAt: false},
            where: {jointAccountId: newDong.jointAccountId},
            include: [
              {
                relation: 'jointAccountSubscribes',
              },
            ],
          },
        },
      ],
    });

    const usersRels = currentUser.usersRels;
    const exterUserRelsList = _.filter(usersRels, (ur) => ur.type !== 'self');
    const selfUserRel = _.find(usersRels, (ur) => ur.type === 'self');

    if (usersRels.length !== allUsersRelsIdList.length) {
      throw new HttpErrors.UnprocessableEntity(
        this.locMsg['SOME_USERS_RELS_NOT_VALID'][this.lang],
      );
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
    });

    try {
      const createdDong = await this.usersRepository
        .dongs(this.userId)
        .create(dong);

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
      const createdPayerList = await this.payerListRepository.createAll(
        payerList,
      );
      // Store payerLists in database
      const createdBillList = await this.billListRepository.createAll(billList);

      const sendNotify = _.has(newDong, 'sendNotify')
        ? newDong.sendNotify
        : true;

      if (currentUserIsPayer && sendNotify) {
        for (const relation of exterUserRelsList) {
          const user = await this.usersRepository.findOne({
            where: {phone: relation.phone},
            include: [{relation: 'setting'}],
          });

          // If relation is mutual, add to notification reciever list
          if (user && user.firebaseToken !== 'null') {
            const foundMutualUsersRels = await this.usersRelsRepository.findOne(
              {
                where: {
                  phone: currentUser.phone,
                  userId: user.getId(),
                },
              },
            );

            if (foundMutualUsersRels) {
              // Increament scoreFactor for every mutual friend contribute in dong
              mutualFactor++;
              // Get rounded dong amount
              const roundedDongAmount = _.find(billList, {
                userRelId: relation.getId(),
              })
                ? Math.floor(
                    _.find(billList, {
                      userRelId: relation.getId(),
                    })!.dongAmount,
                  )
                : 0;

              // Seperate thousands with "," for use in notification body
              const notifyBodyDongAmount = this.numberWithCommas(
                roundedDongAmount,
              );

              // Notification data payload
              const notifyData = new Notifications({
                title: this.locMsg['DONGIP_NOTIFY_TITLE'][
                  user.setting.language
                ],
                body: util.format(
                  this.locMsg['DONGIP_NOTIFY_BODY'][user.setting.language],
                  notifyBodyDongAmount,
                  this.locMsg['CURRENCY'][user.setting.language][
                    createdDong.currency
                  ],
                  foundMutualUsersRels.name,
                ),
                desc: createdDong.desc ? createdDong.desc : '',
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
                .notifications(user.getId())
                .create(notifyData);

              // Generate notification messages
              firebaseMessagesList.push({
                token: user.firebaseToken!,
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

        // send notification to friends
        if (firebaseMessagesList.length > 0) {
          console.log(firebaseMessagesList);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.firebaseSerice.sendAllMessage(firebaseMessagesList);
        }
      }

      const calculatedScore = newDongScore + mutualFactor * mutualFriendScore;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.scores(this.userId).create({
        dongId: createdDong.getId(),
        score: calculatedScore,
      });

      createdDong.billList = createdBillList;
      createdDong.payerList = createdPayerList;

      if (currentUser.jointAccounts) {
        if (
          _.findIndex(billList, {userRelId: currentUser.usersRels[0].getId()}) >
          -1
        ) {
          const userBill = _.find(createdBillList, {
            userRelId: currentUser.usersRels[0].getId(),
          });

          const data: Joint = {
            dongId: createdDong.getId(),
            createdAt: createdDong.createdAt,
            currency: createdDong.currency,
            desc: createdDong.desc,
            title: createdDong.title,
            dongAmount: userBill!.dongAmount,
            categoryTitle: currentUser.categories[0].title,
            categoryIcon: currentUser.categories[0].icon,
            billListId: userBill!.getId(),
          };
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.jointService
            .submit(
              this.userId,
              currentUser.phone,
              currentUser.jointAccounts[0].getId(),
              currentUser.categories[0],
              data,
            )
            .then(async () => {
              await this.billListRepository.updateById(userBill!.billListId!, {
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
      console.error(err);
      throw new HttpErrors.UnprocessableEntity(err.message);
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
}
