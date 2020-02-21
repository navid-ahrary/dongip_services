import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository'
import {
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest'
import {
  UsersRels,
  CategoryBill,
} from '../models'
import { UsersRelsRepository } from '../repositories'
import { authenticate } from '@loopback/authentication'
import { inject } from '@loopback/core'
import { UserProfile, SecurityBindings } from "@loopback/security"

export class UsersRelsCategoryBillController {
  constructor (
    @repository( UsersRelsRepository ) protected usersRelsRepository: UsersRelsRepository,
    @inject( SecurityBindings.USER ) protected currentUserProfile: UserProfile
  ) { }

  @get( '/apis/users-rels/{_key}/category-bills', {
    responses: {
      '200': {
        description: 'Array of UsersRels has many CategoryBill',
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
    @param.path.string( '_key' ) _key: string,
    @param.query.object( 'filter' ) filter?: Filter<CategoryBill>,
  ): Promise<CategoryBill[]> {
    return this.usersRelsRepository.categoryBills( `UsersRels/${ _key }` ).find( filter )
  }

  @post( '/users-rels/{id}/category-bills', {
    responses: {
      '200': {
        description: 'UsersRels model instance',
        content: { 'application/json': { schema: getModelSchemaRef( CategoryBill ) } },
      },
    },
  } )
  async create (
    @param.path.string( 'id' ) id: typeof UsersRels.prototype._key,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( CategoryBill, {
            title: 'NewCategoryBillInUsersRels',
            exclude: [ '_key' ],
            optional: [ 'belongsToUserRelsId' ]
          } ),
        },
      },
    } ) categoryBill: Omit<CategoryBill, '_key'>,
  ): Promise<CategoryBill> {
    return this.usersRelsRepository.categoryBills( id ).create( categoryBill )
  }

  @patch( '/users-rels/{id}/category-bills', {
    responses: {
      '200': {
        description: 'UsersRels.CategoryBill PATCH success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  } )
  async patch (
    @param.path.string( 'id' ) id: string,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( CategoryBill, { partial: true } ),
        },
      },
    } )
    categoryBill: Partial<CategoryBill>,
    @param.query.object( 'where', getWhereSchemaFor( CategoryBill ) ) where?: Where<CategoryBill>,
  ): Promise<Count> {
    return this.usersRelsRepository.categoryBills( id ).patch( categoryBill, where )
  }
}
