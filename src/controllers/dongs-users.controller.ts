import {repository} from '@loopback/repository';
import {param, get, getModelSchemaRef, HttpErrors} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';

import {Users} from '../models';
import {DongsRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';


export class DongsUsersController {
  constructor (
    @repository(DongsRepository) public dongsRepository: DongsRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile
  ) {}

  private checkUserKey (key: string) {
    if (key !== this.currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      );
    }
  }


  @get('/api/dongs/{_dongKey}/users', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users belonging to Dongs',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Users)},
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async getUsers (@param.path.string('_dongKey') _dongKey: string)
    : Promise<Users> {
    const dongId = 'Dongs/' + _dongKey;
    const exManUser = await this.dongsRepository.belongsToUser(dongId);

    this.checkUserKey(exManUser._key);
    return exManUser;
  }
}
