/* eslint-disable prefer-const */
import {Filter, repository, model, property} from '@loopback/repository';
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

import {Dong, UsersRels, DongRelations} from '../models';
import {
  UsersRepository,
  DongRepository,
  CategoryBillRepository,
} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {PostNewDongExample} from './specs';

@model()
export class PostNewDong extends Dong {
  @property({
    type: 'array',
    itemType: 'object',
  })
  billList: {
    usersRelsId: typeof UsersRels.prototype.id;
    dongAmount: number;
    paidAmount: number;
  }[];
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
      include: [
        {
          relation: 'categoryBills',
        },
      ],
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
            exclude: ['id', 'belongsToUserId'],
          }),
          example: PostNewDongExample,
        },
      },
    })
    newDong: Omit<PostNewDong, 'id'>,
  ): Promise<(Dong & DongRelations) | null> {
    const userId = Number(this.currentUserProfile[securityId]);

    let billList = newDong.billList,
      billRelationIdList: {id: number}[] = [],
      dong: Dong,
      categoryBillList = [];

    billList.forEach((bill) => {
      billRelationIdList.push({id: bill.usersRelsId});
    });

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
        belongsToDongId: dong.id,
        belongsToCategoryId: newDong.categoryId,
        belongsToUserId: userId,
        belongsToUserRelId: _b.usersRelsId,
        dongAmount: _b.dongAmount,
        paidAmount: _b.paidAmount,
        settled: _b.paidAmount === _b.dongAmount ? true : false,
        settledAt:
          _b.paidAmount === _b.dongAmount ? newDong.createdAt : undefined,
        createdAt: d.createdAt,
      };
      categoryBillList.push(categoryBill);
    }

    // save all categoryBill objects in database
    await this.categoryBillRepository
      .createAll(categoryBillList)
      .catch(async (_err: string) => {
        await this.dongRepository.deleteById(dong.getId());
        throw new HttpErrors.NotImplemented(_err);
      });

    const filter: Filter<Dong> = {
      where: {id: dong.getId()},
      include: [
        {
          relation: 'categoryBills',
        },
      ],
    };
    return this.dongRepository.findOne(filter);
  }
}
