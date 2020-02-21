import {
  Count, CountSchema, Filter, repository, Where
} from '@loopback/repository'
import {
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
  HttpErrors,
} from '@loopback/rest'
import { SecurityBindings, UserProfile, securityId } from '@loopback/security'
import { authenticate } from '@loopback/authentication'
import { inject } from '@loopback/core'

import { Users, Category } from '../models'
import { UsersRepository, CategoryRepository } from '../repositories'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'

export class UsersCategoryController {
  constructor (
    @repository( UsersRepository )
    protected usersRepository: UsersRepository,
    @repository( CategoryRepository )
    protected categoryRepository: CategoryRepository,
    @inject( SecurityBindings.USER )
    protected currentUserProfile: UserProfile
  ) { }

  private checkUserKey ( key: string ) {
    if ( key !== this.currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      )
    }
  }


  @get( '/apis/users/{_userKey}/categories', {
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
    @param.path.string( '_userKey' ) _userKey: string,
    @param.query.object( 'filter' ) filter?: Filter<Category>,
  ): Promise<Category[]> {
    this.checkUserKey( _userKey )
    const userId = 'Users/' + _userKey
    return this.usersRepository.categories( userId ).find( filter )
  }


  @post( '/apis/users/{_userKey}/categories', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef( Category )
          }
        },
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async create (
    @param.path.string( '_userKey' ) _userKey: typeof Users.prototype._key,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( Category, {
            title: 'NewCategoryInUsers',
            exclude: [
              '_key',
              '_id',
              '_rev',
              'categoryBills',
              'belongsToUserId' ],
          } ),
        },
      },
    } )
    category: Omit<Category, '_key'>,
  ): Promise<Category> {
    this.checkUserKey( _userKey )

    const userId = 'Users/' + _userKey

    const createdCat = await this.usersRepository
      .createHumanKindCategory( userId, category )
      .catch( _err => {
        console.log( _err )
        if ( _err.code === 409 ) {
          const index = _err.response.body.errorMessage.indexOf( 'conflicting' )
          throw new HttpErrors.Conflict(
            _err.response.body.errorMessage.slice( index )
          )
        } else {
          throw new HttpErrors.NotAcceptable( _err )
        }
      } )
    return createdCat
  }


  @patch( '/apis/users/{_userKey}/categories', {
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
    @param.path.string( '_userKey' ) _userKey: string,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( Category, {
            partial: true,
            exclude: [
              "_rev",
              "_id",
              "_key",
              "belongsToUserId",
            ]
          } ),
        },
      },
    } )
    category: Partial<Category>,
    @param.query.object( 'where', getWhereSchemaFor( Category ) )
    where?: Where<Category>,
  ): Promise<Count> {
    this.checkUserKey( _userKey )

    try {
      const _userId = 'Users/' + _userKey
      return await this.usersRepository.categories( _userId )
        .patch( category, where )
    } catch ( _err ) {
      console.log( _err )
      if ( _err.code === 409 ) {
        const index = _err.response.body.errorMessage.indexOf( 'conflicting' )
        throw new HttpErrors.Conflict(
          _err.response.body.errorMessage.slice( index )
        )
      }
      throw new HttpErrors.NotAcceptable( _err.message )
    }
  }
}
