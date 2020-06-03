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

import {Dong, DongRelations, PostNewDong} from '../models';
import {
  UsersRepository,
  DongRepository,
  BillListRepository,
  PayerListRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {PostNewDongExample} from './specs';
import {FirebaseService} from '../services';

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

    let billList = newDong.billList,
      dongRelationIdList: {userRelId: number}[] = [],
      payerList = newDong.payerList,
      payerRelationIdList: {userRelId: number}[] = [],
      allRelationIdList: {userRelId: number}[] = [],
      dong: Dong,
      createdBillList,
      createdPayerList,
      dongTx,
      payerTx,
      billTx,
      firebaseTokenList: string[] = [];

    billList.forEach((item) => {
      dongRelationIdList.push({userRelId: item.userRelId});
      if (_.findIndex(allRelationIdList, {userRelId: item.userRelId}) === -1) {
        allRelationIdList.push({userRelId: item.userRelId});
      }
    });

    payerList.forEach((item) => {
      payerRelationIdList.push({userRelId: item.userRelId});
      if (_.findIndex(allRelationIdList, {userRelId: item.userRelId}) === -1) {
        allRelationIdList.push({userRelId: item.userRelId});
      }
    });

    // validate all usersRels
    const foundUsersRels = await this.usersRepository.usersRels(userId).find({
      where: {or: allRelationIdList},
    });
    if (foundUsersRels.length !== allRelationIdList.length) {
      throw new HttpErrors.NotFound('همه usersRelsId ها باید معتبر باشن');
    }

    //validate categoryId
    await this.usersRepository
      .categories(userId)
      .find({where: {categoryId: newDong.categoryId}})
      .then((_res) => {
        if (_res.length !== 1) {
          throw new HttpErrors.NotFound('categoryId معتبر نیست');
        }
      });

    for (const relation of foundUsersRels) {
      const user = await this.usersRepository.findOne({
        where: {phone: relation.phone},
      });

      if (user) {
        firebaseTokenList.push(user.firebaseToken);
      }
    }

    // create a dong object and save in database
    const d = _.pick(newDong, [
      'title',
      'createdAt',
      'categoryId',
      'desc',
      'pong',
    ]);

    // begin database transactions
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
      dong = await this.usersRepository.dongs(userId).create(d);

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

      createdPayerList = await this.payerListRepository.createAll(payerList);
      createdBillList = await this.billListRepository.createAll(billList);

      // commit database trasactions
      await dongTx.commit();
      await billTx.commit();
      await payerTx.commit();
    } catch (err) {
      // rollback all transactions
      await dongTx.rollback();
      await payerTx.rollback();
      await billTx.rollback();

      throw new HttpErrors.NotImplemented(err.message);
    }

    // send notification
    // this.firebaseSerice.sendMultiCastMessage({}, firebaseTokenList);

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
