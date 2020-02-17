import { Filter, repository } from '@loopback/repository'
import { get, getModelSchemaRef, param, post, requestBody } from '@loopback/rest'
import { UserProfile, SecurityBindings } from '@loopback/security'
import { Category, CategoryBill } from '../models'
import { CategoryRepository } from '../repositories'
import { authenticate } from '@loopback/authentication'
import { inject } from '@loopback/core'

export class CategoryCategoryBillController {
  constructor (
    @repository( CategoryRepository ) protected categoryRepository: CategoryRepository,
  ) { }

  @get( '/apis/categories/{_key}/category-bills', {
    responses: {
      '200': {
        description: "Array of CategoryBill's belonging to Category",
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef( CategoryBill ) },
          },
        },
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async find (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: string,
    @param.query.object( 'filter' ) filter?: Filter<CategoryBill>,
  ): Promise<CategoryBill[]> {
    return this.categoryRepository.categoryBills( _key ).find( filter )
  }

  @post( '/categories/{_key}/category-bills', {
    responses: {
      '200': {
        description: 'Category model instance',
        content: { 'application/json': { schema: getModelSchemaRef( CategoryBill ) } },
      },
    },
  } )
  async create (
    @param.path.string( '_key' ) _key: typeof Category.prototype._key,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( CategoryBill, {
            title: 'NewCategoryBillInCategory',
            exclude: [ '_key' ],
            optional: [ 'belongsToCategoryKey' ],
          } ),
        },
      },
    } )
    categoryBill: Omit<CategoryBill, '_key'>,
  ): Promise<CategoryBill> {
    return this.categoryRepository.createHumanKindCategoryBill( _key, categoryBill )
  }
}
