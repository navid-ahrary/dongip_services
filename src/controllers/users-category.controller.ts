import {
  Count, CountSchema, Filter, repository, Where
} from '@loopback/repository'
import {
  get, getModelSchemaRef, getWhereSchemaFor, param,
  patch, post, requestBody, HttpErrors,
} from '@loopback/rest'
import { Users, Category } from '../models'
import { UsersRepository, CategoryRepository } from '../repositories'
import { SecurityBindings, UserProfile, securityId } from '@loopback/security'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'
import { authenticate } from '@loopback/authentication'
import { inject } from '@loopback/core'

export class UsersCategoryController {
  constructor (
    @repository( UsersRepository ) protected usersRepository: UsersRepository,
    @repository( CategoryRepository ) protected categoryRepository: CategoryRepository,
  ) { }

  @get( '/apis/users/{_key}/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of Category's belonging to Users",
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef( Category ) },
          },
        },
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async find (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: string,
    @param.query.object( 'filter' ) filter?: Filter<Category>,
  ): Promise<Category[]> {
    if ( _key !== currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Error find category, Token is not matched to this user _key!',
      )
    }

    return this.usersRepository.categories( _key ).find( filter )
  }

  @post( '/apis/users/{_key}/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users model instance',
        content: { 'application/json': { schema: getModelSchemaRef( Category ) } },
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async create (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: typeof Users.prototype._key,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( Category, {
            title: 'NewCategoryInUsers',
            exclude: [ '_key', '_id', '_rev', 'categoryBills', 'belongsToUserKey' ],
          } ),
        },
      },
    } )
    category: Omit<Category, '_key'>,
  ): Promise<Category> {
    if ( _key !== currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Error create a category, Token is not matched to this user _key!',
      )
    }

    try {
      const createdCat = await this.usersRepository.createHumanKindCategory( _key, category )
      return createdCat
    } catch ( _err ) {
      console.log( _err )
      if ( _err.code === 409 ) {
        throw new HttpErrors.Conflict( _err.response.body.errorMessage )
      } else {
        throw new HttpErrors.NotAcceptable( _err )
      }
    }
  }

  @patch( '/apis/users/{_key}/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.Category PATCH success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async patch (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: string,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( Category, { partial: true } ),
        },
      },
    } )
    category: Partial<Category>,
    @param.query.object( 'where', getWhereSchemaFor( Category ) ) where?: Where<Category>,
  ): Promise<Count> {
    if ( _key !== currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Error find category, Token is not matched to this user _key!',
      )
    }

    try {
      return await this.usersRepository.categories( _key ).patch( category, where )
    } catch ( _err ) {
      console.log( _err )
      if ( _err.code === 409 ) {
        throw new HttpErrors.Conflict( _err.response.body.errorMessage )
      }
      throw new HttpErrors.NotAcceptable( _err.message )
    }
  }
}
