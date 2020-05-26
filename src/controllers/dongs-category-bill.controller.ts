import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
  api,
} from '@loopback/rest';
import {Dongs, CategoryBill} from '../models';
import {DongsRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@api({
  basePath: '/api/',
  paths: {},
})
@authenticate('jwt.access')
export class DongsCategoryBillController {
  constructor(
    @repository(DongsRepository) protected dongsRepository: DongsRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {}

  @get('/dongs/{dongKey}/category-bills', {
    summary: 'Get all CategoryBills belongs to a Dong by dongKey',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Dongs has many CategoryBill',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(CategoryBill, {includeRelations: false}),
            },
          },
        },
      },
    },
  })
  async find(
    @param.path.string('dongKey') dongKey: string,
  ): Promise<CategoryBill[]> {
    const userKey = this.currentUserProfile[securityId];
    const userId = 'Users/' + userKey;
    const dongId = 'Dongs/' + dongKey;
    const filter: Filter<CategoryBill> = {where: {belongsToUserId: userId}};

    return this.dongsRepository.categoryBills(dongId).find(filter);
  }

  // @patch('/dongs/{dongKey}/category-bills', {
  //   summary: 'Update ',
  //   security: OPERATION_SECURITY_SPEC,
  //   responses: {
  //     '200': {
  //       description: 'Dongs.CategoryBill PATCH success count',
  //       content: {'application/json': {schema: CountSchema}},
  //     },
  //   },
  // })
  // async patch(
  //   @param.path.string('dongKey') dongKey: string,
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(CategoryBill, {partial: true}),
  //       },
  //     },
  //   })
  //   categoryBill: Partial<CategoryBill>,
  //   // @param.query.object('where', getWhereSchemaFor(CategoryBill))
  //   // where?: Where<CategoryBill>,
  // ): Promise<Count> {
  //   return this.dongsRepository
  //     .categoryBills(dongKey)
  //     .patch(categoryBill, where);
  // }

  // @del('/dongs/{id}/category-bills', {
  //   responses: {
  //     '200': {
  //       description: 'Dongs.CategoryBill DELETE success count',
  //       content: {'application/json': {schema: CountSchema}},
  //     },
  //   },
  // })
  // async delete(
  //   @param.path.string('id') id: string,
  //   @param.query.object('where', getWhereSchemaFor(CategoryBill))
  //   where?: Where<CategoryBill>,
  // ): Promise<Count> {
  //   return this.dongsRepository.categoryBills(id).delete(where);
  // }
}
