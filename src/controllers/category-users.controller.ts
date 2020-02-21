import { repository } from '@loopback/repository'
import { param, get, getModelSchemaRef, HttpErrors } from '@loopback/rest'
import { SecurityBindings, UserProfile, securityId } from '@loopback/security'
import { authenticate } from '@loopback/authentication'
import { inject } from '@loopback/core'

import { Category, Users, VirtualUsers } from '../models'
import { CategoryRepository } from '../repositories'

export class CategoryUsersController {
  constructor (
    @repository( CategoryRepository )
    public categoryRepository: CategoryRepository,
    @inject( SecurityBindings.USER ) private currentUserProfile: UserProfile,
  ) { }


  private checkUserKey ( key: string ) {
    if ( key !== this.currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      )
    }
  }


  @get( '/apis/categories/{_key}/users', {
    responses: {
      '200': {
        description: 'Users belonging to Category',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef( Users ) },
          },
        },
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async getUsers (
    @param.path.string( '_key' ) _key: typeof Category.prototype._key,
  ): Promise<Users | VirtualUsers> {
    this.checkUserKey( _key )

    this.currentUserProfile._key = this.currentUserProfile[ securityId ]
    delete this.currentUserProfile[ securityId ]

    return this.categoryRepository.belongsToUser( 'Users/' + _key )
  }
}
