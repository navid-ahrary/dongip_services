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
import {inject} from '@loopback/core';
import _ from 'underscore';

import {Dong, DongRelations, PostNewDong} from '../models';
import {
  UsersRepository,
  DongRepository,
  CategoryBillRepository,
  BillListRepository,
  PayerListRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {PostNewDongExample} from './specs';

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
    @repository(CategoryBillRepository)
    private categoryBillRepository: CategoryBillRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
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
              items: getModelSchemaRef(Dong, {includeRelations: true}),
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
      where: {belongsToUserId: userId},
      include: [{relation: 'payerList'}, {relation: 'billList'}],
    };

    return this.usersRepository.dong(userId).find(filter);
  }

  @post('/dongs', {
    summary: 'Create a new Dongs',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dongs model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Dong, {}),
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
          }),
          example: PostNewDongExample,
        },
      },
    })
    newDong: Omit<PostNewDong, 'id'>,
  ): Promise<(Dong & DongRelations) | null> {
    const userId = Number(this.currentUserProfile[securityId]);

    let billList = newDong.billList,
      dongRelationIdList: {id: number}[] = [],
      payerList = newDong.payerList,
      payerRelationIdList: {id: number}[] = [],
      allRelationIdList: {id: number}[] = [],
      dong: Dong,
      createdBillList,
      createdPayerList;
    // categoryBillList = [];

    billList.forEach((item) => {
      dongRelationIdList.push({id: item.usersRelsId});
      if (_.findIndex(allRelationIdList, {id: item.usersRelsId}) === -1) {
        allRelationIdList.push({id: item.usersRelsId});
      }
    });

    payerList.forEach((item) => {
      payerRelationIdList.push({id: item.usersRelsId});
      if (_.findIndex(allRelationIdList, {id: item.usersRelsId}) === -1) {
        allRelationIdList.push({id: item.usersRelsId});
      }
    });

    // validate all usersRels
    await this.usersRepository
      .usersRels(userId)
      .find({
        where: {or: allRelationIdList},
      })
      .then((res) => {
        if (res.length !== allRelationIdList.length) {
          throw new HttpErrors.NotFound('Some of usersRels are not found');
        }
      });

    //validate categoryId
    await this.usersRepository
      .categories(userId)
      .find({where: {id: newDong.categoryId}})
      .then((_res) => {
        if (_res.length !== 1) {
          throw new HttpErrors.NotFound(
            'دسته بندی با این id برای شما وجود نداره',
          );
        }
      });

    // create a dong object and save in database
    const d = _.pick(newDong, [
      'title',
      'createdAt',
      'categoryId',
      'desc',
      'pong',
    ]);

    try {
      // begin database transactions
      const dongTx = await this.usersRepository.beginTransaction(
        IsolationLevel.READ_COMMITTED,
      );
      const payerTx = await this.payerListRepository.beginTransaction(
        IsolationLevel.READ_COMMITTED,
      );
      const billTx = await this.billListRepository.beginTransaction(
        IsolationLevel.READ_COMMITTED,
      );

      dong = await this.usersRepository.dong(userId).create(d);

      payerList.forEach((item) => {
        item = Object.assign(item, {
          dongId: dong.getId(),
          createdAt: dong.createdAt,
          categoryId: dong.categoryId,
        });
      });

      billList.forEach((item) => {
        item = Object.assign(item, {
          dongId: dong.getId(),
          createdAt: dong.createdAt,
          categoryId: dong.categoryId,
        });
      });

      createdPayerList = await this.payerListRepository.createAll(payerList);
      createdBillList = await this.billListRepository.createAll(billList);

      // commit database trasactions
      await dongTx.commit();
      await billTx.commit();
      await payerTx.commit();
    } catch (_err) {
      throw new HttpErrors.NotImplemented(_err);
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
