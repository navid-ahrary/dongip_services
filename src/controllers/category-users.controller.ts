import { repository } from '@loopback/repository'
import { param, get, getModelSchemaRef, HttpErrors } from '@loopback/rest'
import { SecurityBindings, UserProfile, securityId } from '@loopback/security'
import { Category, Users } from '../models'
import { CategoryRepository } from '../repositories'
import { authenticate } from '@loopback/authentication'
import { inject } from '@loopback/core'

export class CategoryUsersController
{
  constructor (
    @repository( CategoryRepository )
    public categoryRepository: CategoryRepository,
  ) { }

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
  @authenticate( 'jwt' )
  async getUsers (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: typeof Category.prototype._key,
  ): Promise<Users>
  {
    currentUserProfile._key = currentUserProfile[ securityId ]
    delete currentUserProfile[ securityId ]

    if ( _key !== currentUserProfile._key )
    {
      throw new HttpErrors.Unauthorized( 'Token is not matched to this user _key!' )
    }
    return this.categoryRepository.users( _key )
  }
}
