import { repository } from '@loopback/repository'
import { param, get, getModelSchemaRef, } from '@loopback/rest'
import { authenticate } from '@loopback/authentication'

import { VirtualUsers, Users } from '../models'
import { VirtualUsersRepository } from '../repositories'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'


export class VirtualUsersUsersController {
  constructor (
    @repository( VirtualUsersRepository )
    public virtualUsersRepository: VirtualUsersRepository,
  ) { }

  @get( '/apis/virtual-users/{_virtualUserKey}/users', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users belonging to VirtualUsers',
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
    @param.path.string( 'i_virtualUserKeyd' )
    _virtualUserKey: typeof VirtualUsers.prototype._key, ): Promise<Users> {
    const virtualUserId = 'VirtualUsers/' + _virtualUserKey
    return this.virtualUsersRepository.belongsToUser( virtualUserId )
  }
}
