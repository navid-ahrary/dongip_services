import {repository} from '@loopback/repository';
import {param, get, getModelSchemaRef, HttpErrors} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {Category, Users} from '../models';
import {CategoryRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';

export class CategoryUsersController {
  constructor(
    @repository(CategoryRepository)
    public categoryRepository: CategoryRepository,
  ) {}

  @get('/apis/categories/{id}/users', {
    responses: {
      '200': {
        description: 'Users belonging to Category',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Users)},
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async getUsers(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('id') id: typeof Category.prototype.id,
  ): Promise<Users> {
    currentUserProfile.id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    if (id !== currentUserProfile.id) {
      throw new HttpErrors.Unauthorized('Token is not matched to this user id!');
    }
    return this.categoryRepository.users(id);
  }
}
