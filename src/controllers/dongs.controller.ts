/* eslint-disable prefer-const */
import {
  Filter,
  repository,
  IsolationLevel,
  Transaction,
} from '@loopback/repository';
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

import {Dong, DongRelations, PostNewDong, UsersRels, Category} from '../models';
import {
  UsersRepository,
  DongRepository,
  BillListRepository,
  PayerListRepository,
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
    summary: 'Get array of Dongs with filter',
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
      where: {userId: userId},
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
  ): Promise<(Dong & DongRelations) | null> {
    const userId = Number(this.currentUserProfile[securityId]);

    if (newDong.userId) {
      if (userId !== newDong.userId) {
        throw new HttpErrors.Unauthorized('userId با توکن شما همخونی نداره');
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
      allRelationIdList: {userRelId: number}[] = [],
      dong: Dong,
      curretnUserIsPayer: Boolean = false,
      createdBillList,
      createdPayerList,
      currentUserFoundUsersRelsList: UsersRels[],
      curretnUserFoundCategoryList: Category[],
      dongTx: Transaction,
      payerTx: Transaction,
      billTx: Transaction,
      firebaseMessagesList: BatchMessage = [];

    payerList.forEach((item) => {
      if (_.findIndex(allRelationIdList, {userRelId: item.userRelId}) === -1) {
        allRelationIdList.push({userRelId: item.userRelId});
      }
    });

    billList.forEach((item) => {
      if (_.findIndex(allRelationIdList, {userRelId: item.userRelId}) === -1) {
        allRelationIdList.push({userRelId: item.userRelId});
      }
    });

    currentUserFoundUsersRelsList = await this.usersRepository
      .usersRels(userId)
      .find({
        where: {or: allRelationIdList},
      });
    // Validate all usersRels
    if (currentUserFoundUsersRelsList.length !== allRelationIdList.length) {
      throw new HttpErrors.NotFound('بنظر میرسه بعضی از دوستی ها معتبر نیستن!');
    }

    curretnUserFoundCategoryList = await this.usersRepository
      .categories(userId)
      .find({where: {categoryId: newDong.categoryId}});
    // Validate categoryId
    if (curretnUserFoundCategoryList.length !== 1) {
      throw new HttpErrors.NotFound('دسته بندی معتبر نیس!');
    }

    const userRel = await this.usersRepository
      .usersRels(userId)
      .find({where: {userRelId: payerList[0].userRelId}});

    if (userRel[0].type === 'self') curretnUserIsPayer = true;

    // Areate a dong object and save in database
    const d = _.pick(newDong, [
      'title',
      'createdAt',
      'categoryId',
      'desc',
      'pong',
    ]);

    // Begin database transactions
    dongTx = await this.usersRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    payerTx = await this.payerListRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    billTx = await this.billListRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );

    try {
      dong = await this.usersRepository
        .dongs(userId)
        .create(d, {transaction: dongTx});

      payerList.forEach((item) => {
        item = Object.assign(item, {
          dongId: dong.getId(),
          createdAt: dong.createdAt,
          categoryId: dong.categoryId,
          userId: userId,
        });
      });

      billList.forEach((item) => {
        item = Object.assign(item, {
          dongId: dong.getId(),
          createdAt: dong.createdAt,
          categoryId: dong.categoryId,
          userId: userId,
        });
      });

      // Store bill list in database
      createdPayerList = await this.payerListRepository.createAll(payerList, {
        transaction: payerTx,
      });
      // Store payer list in database
      createdBillList = await this.billListRepository.createAll(billList, {
        transaction: billTx,
      });

      // Commit database trasactions
      await dongTx.commit();
      await billTx.commit();
      await payerTx.commit();
    } catch (err) {
      // If error occured, rollback all transactions
      await dongTx.rollback();
      await payerTx.rollback();
      await billTx.rollback();

      throw new HttpErrors.NotImplemented(err.message);
    }

    if (curretnUserIsPayer) {
      for (const relation of currentUserFoundUsersRelsList) {
        if (relation.type !== 'self') {
          const user = await this.usersRepository.findOne({
            where: {phone: relation.phone},
          });

          // Check mutual relation
          // if so, add to notification reciever list
          if (user) {
            const mutualRelList: UsersRels[] = await this.usersRepository
              .usersRels(user.getId())
              .find({where: {phone: currentUserPhone}});

            if (mutualRelList.length === 1) {
              // Generate notification messages
              firebaseMessagesList.push({
                token: user.firebaseToken,
                notification: {
                  title: 'دنگیپ شدی',
                  body: mutualRelList[0].name,
                },
                data: {
                  desc: dong.desc ? dong.desc : '',
                  categoryTitle: curretnUserFoundCategoryList[0].title,
                  createdAt: dong.createdAt,
                  userRelId: mutualRelList[0].getId(),
                  payer: '',
                  dongAmount: _.find(billList, {usersRelsId: relation.getId()})
                    ? _.find(billList, {
                        usersRelsId: relation.getId(),
                      })!.dongAmount.toString()
                    : '0',
                  paidAmount: _.find(payerList, {usersRelsId: relation.getId()})
                    ? _.find(payerList, {
                        usersRelsId: relation.getId(),
                      })!.paidAmount.toString()
                    : '0',
                },
              });
            }
          }
        }
      }

      // send notification to friends
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.firebaseSerice.sendAllMessage(firebaseMessagesList);
    }

    dong.billList = createdBillList;
    dong.payerList = createdPayerList;

    return dong;
    // // create categoryBill object for every usersRels
    // for (const _b of billList) {
    //   const categoryBill = {
    //     belongsToDongId: dong.id,
    //     belongsToCategoryId: newDong.categoryId,
    //     belongsToUserId: userId,
    //     belongsToUserRelId: _b.usersRelsId,
    //     dongAmount: _b.dongAmount,
    //     paidAmount: _b.paidAmount,
    //     settled: _b.paidAmount === _b.dongAmount ? true : false,
    //     settledAt:
    //       _b.paidAmount === _b.dongAmount ? newDong.createdAt : undefined,
    //     createdAt: d.createdAt,
    //   };
    //   categoryBillList.push(categoryBill);
    // }

    // // save all categoryBill objects in database
    // await this.categoryBillRepository
    //   .createAll(categoryBillList)
    //   .catch(async (_err: string) => {
    //     await this.dongRepository.deleteById(dong.getId());
    //     throw new HttpErrors.NotImplemented(_err);
    //   });
  }
}
