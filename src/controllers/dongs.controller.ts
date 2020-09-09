/* eslint-disable prefer-const */
import {
  Filter,
  repository,
  property,
  model,
  CountSchema,
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
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, service, intercept} from '@loopback/core';
import _ from 'underscore';

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
import {PostNewDongExample} from './specs';
import {FirebaseService, BatchMessage} from '../services';
import {
  ValidateCategoryIdInterceptor,
  FirebasetokenInterceptor,
} from '../interceptors';
import {ValidateGroupIdInterceptor} from '../interceptors/validate-group-id.interceptor';

@model()
class ResponseNewDong extends Dongs {
  @property({type: 'number', required: true})
  score: number;
}
@intercept(
  ValidateGroupIdInterceptor.BINDING_KEY,
  FirebasetokenInterceptor.BINDING_KEY,
)
@api({basePath: '/', paths: {}})
@authenticate('jwt.access')
export class DongsController {
  userId: number;

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
    @inject(SecurityBindings.USER)
    private currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

  public numberWithCommas(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  @get('/dongs', {
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
  async findDongs(
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<Dongs[]> {
    const filter: Filter<Dongs> = {
      order: ['createdAt DESC'],
      include: [{relation: 'payerList'}, {relation: 'billList'}],
    };

    return this.usersRepository.dongs(this.userId).find(filter);
  }

  @intercept(ValidateCategoryIdInterceptor.BINDING_KEY)
  @post('/dongs', {
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
          schema: getModelSchemaRef(PostNewDong, {
            title: 'NewDongs',
            optional: ['title', 'desc', 'groupId'],
          }),
          example: PostNewDongExample,
        },
      },
    })
    newDong: Omit<PostNewDong, 'id'>,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<ResponseNewDong> {
    const newDongScore = 50;
    const mutualFriendScore = 20;
    let mutualFactor = 0;

    if (newDong.userId) delete newDong.userId;
    if (newDong.dongId) delete newDong.dongId;

    // Current user
    const currentUser = await this.usersRepository.findOne({
        where: {userId: this.userId},
        fields: {userId: true, phone: true, name: true},
      }),
      currentUserPhone = currentUser!.phone;

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
    const currentUserFoundUsersRelsList = await this.usersRepository
      .usersRels(this.userId)
      .find({
        where: {or: allUsersRelsIdList},
      });
    if (currentUserFoundUsersRelsList.length !== allUsersRelsIdList.length) {
      throw new HttpErrors.NotFound('بعضی از دوستی ها معتبر نیستن!');
    }

    // Check payer is user himself
    const userRel = await this.usersRepository.usersRels(this.userId).find({
      where: {and: [{userRelId: payerList[0].userRelId}, {type: 'self'}]},
    });
    if (userRel.length === 1) currentUserIsPayer = true;

    // Create a Dongs entity
    const dong: Dongs = new Dongs(
      _.pick(newDong, [
        'title',
        'createdAt',
        'categoryId',
        'desc',
        'pong',
        'groupId',
      ]),
    );

    try {
      const createdDong = await this.usersRepository
        .dongs(this.userId)
        .create(dong);

      payerList.forEach((item) => {
        item = Object.assign(item, {
          userId: this.userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
        });
      });

      billList.forEach((item) => {
        item = Object.assign(item, {
          userId: this.userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
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
        const currentUserCategory = await this.categoriesRepository.findById(
          newDong.categoryId,
          {fields: {title: true, icon: true}},
        );

        for (const relation of currentUserFoundUsersRelsList) {
          if (relation.type !== 'self') {
            const user = await this.usersRepository.findOne({
              where: {phone: relation.phone},
            });

            // If relation is mutual, add to notification reciever list
            if (user && user.firebaseToken !== 'null') {
              const foundMutualUsersRels = await this.usersRelsRepository.findOne(
                {
                  where: {
                    and: [{phone: currentUserPhone}, {userId: user.getId()}],
                  },
                },
              );

              if (foundMutualUsersRels) {
                // Increament scoreFactor for every mutual friend dong contribution
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
                const notifyData: Partial<Notifications> = {
                  title: 'دنگیپ شدی',
                  body: `از طرف ${foundMutualUsersRels.name} مبلغ ${notifyBodyDongAmount} تومن`,
                  desc: createdDong.desc ? createdDong.desc : '',
                  type: 'dong',
                  categoryTitle: currentUserCategory.title,
                  categoryIcon: currentUserCategory.icon,
                  createdAt: newDong.createdAt,
                  userRelId: foundMutualUsersRels.getId(),
                  dongAmount: roundedDongAmount,
                  dongId: createdDong.getId(),
                };

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
                    dongId: notifyData.dongId!.toString(),
                  },
                  // Android options
                  android: {
                    notification: {clickAction: 'FLUTTER_NOTIFICATION_CLICK'},
                  },
                  // iOS options
                  apns: {
                    payload: {
                      aps: {
                        alert: {actionLocKey: 'FLUTTER_NOTIFICATION_CLICK'},
                      },
                    },
                    fcmOptions: {},
                  },
                });
              }
            }
          }
        }

        // send notification to friends
        if (firebaseMessagesList.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.firebaseSerice.sendAllMessage(firebaseMessagesList);
        }
        // console.log(JSON.stringify(firebaseMessagesList));
      }

      const createdScore = await this.usersRepository
        .scores(this.userId)
        .create({
          createdAt: newDong.createdAt,
          score: newDongScore + mutualFactor * mutualFriendScore,
          desc: `dong-${createdDong.getId()}`,
        });

      createdDong.billList = createdBillList;
      createdDong.payerList = createdPayerList;

      const response: ResponseNewDong = Object({
        ...createdDong,
        score: createdScore.score,
      });

      return response;
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
    const countDeleted = await this.usersRepository.dongs(this.userId).delete({
      dongId: dongId,
    });

    if (countDeleted.count !== 1) {
      throw new HttpErrors.UnprocessableEntity('دنگ مورد نظر وجود ندارد!');
    }
  }

  @del('/dongs', {
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
