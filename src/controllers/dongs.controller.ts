/* eslint-disable prefer-const */
import {Filter, repository, IsolationLevel} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  post,
  requestBody,
  HttpErrors,
  api,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import _ from 'underscore';

import {Dong, PostNewDong} from '../models';
import {
  UsersRepository,
  DongRepository,
  BillListRepository,
  PayerListRepository,
  CategoryRepository,
  UsersRelsRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {PostNewDongExample} from './specs';
import {FirebaseService, BatchMessage} from '../services';

@api({
  basePath: '/api/',
  paths: {},
})
export class DongsController {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @repository(CategoryRepository)
    public categoryRepository: CategoryRepository,
    @repository(DongRepository) public dongRepository: DongRepository,
    @repository(PayerListRepository)
    public payerListRepository: PayerListRepository,
    @repository(BillListRepository)
    public billListRepository: BillListRepository,
    @service(FirebaseService) private firebaseSerice: FirebaseService,
    @inject(SecurityBindings.USER)
    private currentUserProfile: UserProfile,
  ) {}

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
              items: getModelSchemaRef(Dong, {includeRelations: false}),
            },
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async find(): Promise<Dong[]> {
    const userId = Number(this.currentUserProfile[securityId]);

    const filter: Filter<Dong> = {
      order: ['createdAt DESC'],
      include: [{relation: 'payerList'}, {relation: 'billList'}],
    };

    return this.usersRepository.dongs(userId).find(filter);
  }

  @post('/dongs', {
    summary: 'Create a new Dongs',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dongs model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Dong, {includeRelations: false}),
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PostNewDong, {
            title: 'NewDong',
            optional: ['title', 'desc'],
          }),
          example: PostNewDongExample,
        },
      },
    })
    newDong: Omit<PostNewDong, 'id'>,
  ): Promise<Dong> {
    const userId = Number(this.currentUserProfile[securityId]);

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
      allUsersRelsIdList: {userRelId: number}[] = [],
      currentUserIsPayer: Boolean = false,
      firebaseMessagesList: BatchMessage = [];

    if (payerList.length !== 1) {
      throw new HttpErrors.UnprocessableEntity(
        'بیشتر از یک پرداخت کننده تموم کردیم!',
      );
    }

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
      .usersRels(userId)
      .find({where: {or: allUsersRelsIdList}});
    if (currentUserFoundUsersRelsList.length !== allUsersRelsIdList.length) {
      throw new HttpErrors.NotFound('بعضی از دوستی ها معتبر نیستن!');
    }

    // Validate categoryId in request body
    const curretnUserFoundCategoryList = await this.categoryRepository.findOne({
      where: {userId: userId, categoryId: newDong.categoryId},
    });
    if (!curretnUserFoundCategoryList) {
      throw new HttpErrors.NotFound('این دسته بندی معتبر نیس!');
    }
    const curretnUserFoundCategoryTitle = curretnUserFoundCategoryList.title;

    const userRel = await this.usersRelsRepository.findOne({
      where: {and: [{userRelId: payerList[0].userRelId}, {userId: userId}]},
    });

    if (userRel?.type === 'self') currentUserIsPayer = true;

    // Create a Dongs entity
    const dong: Dong = new Dong(
      _.pick(newDong, ['title', 'createdAt', 'categoryId', 'desc', 'pong']),
    );

    // Begin transactions
    const dongRepoTx = await this.usersRepository.beginTransaction(
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
        .create(dong, {transaction: dongRepoTx});

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

      if (currentUserIsPayer) {
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
                // Get dong amount
                const dongAmount = _.find(billList, {
                  userRelId: relation.getId(),
                })
                  ? _.find(billList, {
                      userRelId: relation.getId(),
                    })!.dongAmount.toString()
                  : '0';

                // Generate notification messages
                firebaseMessagesList.push({
                  token: user.firebaseToken,
                  notification: {
                    title: 'دنگیپ شدی',
                    body: foundMutualUsersRels.name,
                  },
                  data: {
                    desc: createdDong.desc ? createdDong.desc : '',
                    categoryTitle: curretnUserFoundCategoryTitle,
                    createdAt: createdDong.createdAt.toString(),
                    userRelId: foundMutualUsersRels.getId().toString(),
                    dongAmount: dongAmount,
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
      }

      dong.billList = createdBillList;
      dong.payerList = createdPayerList;

      // Commit trasactions
      await dongRepoTx.commit();
      await payerRepoTx.commit();
      await billRepoTx.commit();

      return dong;
    } catch (err) {
      // Rollback transactions
      await dongRepoTx.rollback();
      await payerRepoTx.rollback();
      await billRepoTx.rollback();

      throw new HttpErrors.NotImplemented(err.message);
    }
  }
}
