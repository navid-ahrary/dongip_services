import {Filter, repository} from '@loopback/repository';
import {get, getModelSchemaRef, param, api} from '@loopback/rest';
import {CategoryBill, Dong} from '../models';
import {DongRepository} from '../repositories';
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
    @repository(DongRepository) public dongRepository: DongRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {}

  @get('/dongs/{dongId}/category-bills', {
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
    @param.path.number('dongId') dongId: typeof Dong.prototype.id,
  ): Promise<CategoryBill[]> {
    const userId = Number(this.currentUserProfile[securityId]);
    const filter: Filter<CategoryBill> = {where: {belongsToUserId: userId}};

    return this.dongRepository.categoryBills(dongId).find(filter);
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
