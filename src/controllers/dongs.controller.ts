/* eslint-disable prefer-const */
import {Filter, repository, model, property} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  HttpErrors,
  api,
} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import _ from 'underscore';

import {Dong} from '../models';
import {
  UsersRepository,
  DongRepository,
  CategoryBillRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {PostNewDongExample} from './specs/dongs.specs';

@model()
export class PostNewDong extends Dong {
  @property({
    type: 'array',
    itemType: 'object',
  })
  billList: {usersRelsId: string; dongAmount: number; paidAmount: number}[];

  // @property({
  //   type: 'array',
  //   itemType: 'object',
  // })
  // exManList: {usersRelsId: string; paidAmount: number}[];
}

@api({
  basePath: '/api/',
  paths: {},
})
export class DongsController {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(DongRepository) public dongRepository: DongRepository,
    @repository(CategoryBillRepository)
    private categoryBillRepository: CategoryBillRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {}

  private checkUserKey(key: string) {
    if (key !== this.currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      );
    }
  }

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
  async find(
    @param.query.object('filter') filter?: Filter<Dong>,
  ): Promise<Dong[]> {
    const userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + userKey;

    filter = Object.assign(filter, {
      orders: 'createdAt DESC',
      where: {belongsToUserId: userId},
    });

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
            exclude: ['_key', '_id', '_rev', 'belongsToUserId'],
          }),
          example: PostNewDongExample,
        },
      },
    })
    newDong: Omit<PostNewDong, '_key'>,
  ): Promise<Dong> {
    const userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + userKey;

    let billList = newDong.billList,
      billRelationIdList: {_id: string}[] = [],
      // exManList = newDong.exManList,
      // exManRelationIdList: {_id: string}[] = [],
      // allUsersRelsId: {_id: string}[] = [],
      dong: Dong,
      categoryBillList = [];

    billList.forEach((bill) => {
      billRelationIdList.push({_id: bill.usersRelsId});
      // if (_.findIndex(allUsersRelsId, {_id: bill.usersRelsId}) === -1) {
      //   allUsersRelsId.push({_id: bill.usersRelsId});
      // }
    });

    // exManList.forEach((exMan) => {
    //   exManRelationIdList.push({_id: exMan.usersRelsId});
    //   if (_.findIndex(allUsersRelsId, {_id: exMan.usersRelsId}) === -1) {
    //     allUsersRelsId.push({_id: exMan.usersRelsId});
    //   }
    // });

    // validate all usersRels
    await this.usersRepository
      .usersRels(userId)
      .find({
        where: {or: billRelationIdList},
      })
      .then((res) => {
        if (res.length !== billRelationIdList.length) {
          throw new HttpErrors.NotFound('Some of usersRels are not found');
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
    dong = await this.usersRepository.dong(userId).create(d);

    // create categoryBill object for every usersRels
    for (const _b of billList) {
      const categoryBill = {
        belongsToDongId: dong._id,
        belongsToCategoryId: newDong.categoryId,
        belongsToUserId: userId,
        belongsToUserRelId: _b.usersRelsId,
        dongAmount: _b.dongAmount,
        paidAmount: _b.paidAmount,
        settled: _b.paidAmount === _b.dongAmount ? true : false,
        settledAt:
          _b.paidAmount === _b.dongAmount ? newDong.createdAt : undefined,
        createdAt: newDong.createdAt,
      };
      categoryBillList.push(categoryBill);
    }

    // save all categoryBill objects in database
    await this.categoryBillRepository
      .createAll(categoryBillList)
      .catch(async (_err) => {
        await this.dongRepository.deleteById(dong._key);
        throw new HttpErrors.NotImplemented(_err);
      });
    return dong;
  }
}
