/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable prefer-const */
import {
  Filter,
  repository,
  IsolationLevel,
  property,
  model,
} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  post,
  requestBody,
  HttpErrors,
  api,
  param,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, service, intercept} from '@loopback/core';
import _ from 'underscore';
import {floor} from 'lodash';

import {Dongs, PostNewDong} from '../models';
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

@model()
class ResponseNewDong extends Dongs {
  @property({type: 'number', required: true})
  score: number;
}

@api({
  basePath: '/api/',
  paths: {},
})
@intercept(FirebasetokenInterceptor.BINDING_KEY)
@authenticate('jwt.access')
export class DongsController {
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
  ) {}

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
    const userId = Number(this.currentUserProfile[securityId]);

    const filter: Filter<Dongs> = {
      order: ['createdAt DESC'],
      include: [{relation: 'payerList'}, {relation: 'billList'}],
    };

    return this.usersRepository.dongs(userId).find(filter);
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
            optional: ['title', 'desc'],
          }),
          example: PostNewDongExample,
        },
      },
    })
    newDong: Omit<PostNewDong, 'id'>,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<ResponseNewDong> {
    const userId = Number(this.currentUserProfile[securityId]);
    const newDongScore = 50;
    const mutualFriendScore = 20;
    let mutualFactor = 0;

    if (newDong.userId) {
      if (newDong.userId !== userId) {
        throw new HttpErrors.Unauthorized('userId با توکن شما همخوانی نداره');
      }
    }
    // Current user
    const currentUser = await this.usersRepository.findOne({
      where: {userId: userId},
      fields: {userId: true, phone: true, name: true},
    }),
      currentUserPhone = currentUser!.phone;

    let billList = newDong.billList,
      payerList = newDong.payerList,
      allUsersRelsIdList: {userRelId: number;}[] = [],
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
    const currentUserFoundUsersRelsList = await this.usersRelsRepository.find({
      where: {or: allUsersRelsIdList, and: [{userId: userId}]},
    });
    if (currentUserFoundUsersRelsList.length !== allUsersRelsIdList.length) {
      throw new HttpErrors.NotFound('بعضی از دوستی ها معتبر نیستن!');
    }


    const userRel = await this.usersRepository.usersRels(userId).find({
      where: {and: [{userRelId: payerList[0].userRelId}, {type: 'self'}]},
    });


    if (userRel.length === 1) currentUserIsPayer = true;

    // Create a Dongs entity
    const dong: Dongs = new Dongs(
      _.pick(newDong, ['title', 'createdAt', 'categoryId', 'desc', 'pong']),
    );

    // Begin transactions
    const usersRepoTx = await this.usersRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    const payerRepoTx = await this.payerListRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    const billRepoTx = await this.billListRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );

    try {
      const createdDong = await this.usersRepository
        .dongs(userId)
        .create(dong, {transaction: usersRepoTx});

      payerList.forEach((item) => {
        item = Object.assign(item, {
          userId: userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
        });
      });

      billList.forEach((item) => {
        item = Object.assign(item, {
          userId: userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
        });
      });

      // Store billlists in database
      const createdPayerList = await this.payerListRepository.createAll(
        payerList,
        {transaction: payerRepoTx},
      );
      // Store payerLists in database
      const createdBillList = await this.billListRepository.createAll(
        billList,
        {transaction: billRepoTx},
      );

      const sendNotify = _.has(newDong, 'sendNotify')
        ? newDong.sendNotify
        : true;

      if (currentUserIsPayer && sendNotify) {
        const currentUserCategory = await this.categoriesRepository.findById(
          newDong.categoryId,
          {fields: {title: true}},
        );

        for (const relation of currentUserFoundUsersRelsList) {
          if (relation.type !== 'self') {
            const user = await this.usersRepository.findOne({
              where: {phone: relation.phone},
            });

            // If relation is mutual, add to notification reciever list
            if (user) {
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
                  ? floor(
                    _.find(billList, {
                      userRelId: relation.getId(),
                    })!.dongAmount,
                  )
                  : 0;

                // Seperate thousands with "," for use in notification body
                const notifyBodyDongAmount = this.numberWithCommas(
                  roundedDongAmount,
                );

                // Generate notification messages
                firebaseMessagesList.push({
                  token: user.firebaseToken,
                  // Android push notification messages
                  android: {
                    notification: {
                      title: 'دنگیپ شدی',
                      body: `از طرف ${foundMutualUsersRels.name} مبلغ ${notifyBodyDongAmount} تومن`,
                      clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                    },
                    data: {
                      title: 'دنگیپ شدی',
                      body: `از طرف ${foundMutualUsersRels.name} مبلغ ${notifyBodyDongAmount} تومن`,
                      desc: createdDong.desc ? createdDong.desc : '',
                      type: 'dong',
                      categoryTitle: currentUserCategory.title,
                      createdAt: newDong.createdAt,
                      userRelId: foundMutualUsersRels.getId().toString(),
                      dongAmount: roundedDongAmount.toString(),
                    },
                  },
                  // iOS push notification messages
                  // apns: {},
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

      const createdScore = await this.usersRepository.scores(userId).create({
        createdAt: newDong.createdAt,
        score: newDongScore + mutualFactor * mutualFriendScore,
        desc: `dong-${createdDong.getId()}`,
      });

      createdDong.billList = createdBillList;
      createdDong.payerList = createdPayerList;

      // Commit trasactions
      await usersRepoTx.commit();
      await payerRepoTx.commit();
      await billRepoTx.commit();

      const response: ResponseNewDong = Object({
        ...createdDong,
        score: createdScore.score,
      });

      return response;
    } catch (err) {
      // Rollback transactions
      await usersRepoTx.rollback();
      await payerRepoTx.rollback();
      await billRepoTx.rollback();

      throw new HttpErrors.UnprocessableEntity(err);
    }
  }
}
