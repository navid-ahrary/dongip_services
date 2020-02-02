import { repository } from '@loopback/repository'
import { param, get, getModelSchemaRef } from '@loopback/rest'
import { Dongs, Users } from '../models'
import { DongsRepository } from '../repositories'
import { authenticate } from '@loopback/authentication'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'

export class DongsUsersController {
  constructor (
    @repository( DongsRepository )
    public dongsRepository: DongsRepository,
  ) { }

  @get( '/dongs/{_key}/users', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users belonging to Dongs',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef( Users ) },
          },
        },
      },
    },
  } )
  @authenticate( 'jwt' )
  async getUsers ( @param.path.string( '_key' ) _key: typeof Dongs.prototype._key )
    : Promise<Users> {
    return this.dongsRepository.belongsToUser( _key )
  }
}
