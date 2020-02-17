import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository'
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest'
import {
  Users,
  CategoryBill,
} from '../models'
import { UsersRepository } from '../repositories'

export class UsersCategoryBillController {
  constructor (
    @repository( UsersRepository ) protected usersRepository: UsersRepository,
  ) { }

  @get( '/users/{id}/category-bills', {
    responses: {
      '200': {
        description: 'Array of Users has many CategoryBill',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef( CategoryBill ) },
          },
        },
      },
    },
  } )
  async find (
    @param.path.string( 'id' ) id: string,
    @param.query.object( 'filter' ) filter?: Filter<CategoryBill>,
  ): Promise<CategoryBill[]> {
    return this.usersRepository.categoryBills( id ).find( filter )
  }

  @post( '/users/{id}/category-bills', {
    responses: {
      '200': {
        description: 'Users model instance',
        content: { 'application/json': { schema: getModelSchemaRef( CategoryBill ) } },
      },
    },
  } )
  async create (
    @param.path.string( 'id' ) id: typeof Users.prototype._key,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( CategoryBill, {
            title: 'NewCategoryBillInUsers',
            exclude: [ '_key' ],
            optional: [ '_from' ]
          } ),
        },
      },
    } ) categoryBill: Omit<CategoryBill, '_key'>,
  ): Promise<CategoryBill> {
    return this.usersRepository.categoryBills( id ).create( categoryBill )
  }

  @patch( '/users/{id}/category-bills', {
    responses: {
      '200': {
        description: 'Users.CategoryBill PATCH success count',
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
    return this.usersRepository.categoryBills( id ).patch( categoryBill, where )
  }

  @del( '/users/{id}/category-bills', {
    responses: {
      '200': {
        description: 'Users.CategoryBill DELETE success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  } )
  async delete (
    @param.path.string( 'id' ) id: string,
    @param.query.object( 'where', getWhereSchemaFor( CategoryBill ) ) where?: Where<CategoryBill>,
  ): Promise<Count> {
    return this.usersRepository.categoryBills( id ).delete( where )
  }
}
