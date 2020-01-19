import { repository } from '@loopback/repository';
import { param, get, getModelSchemaRef, HttpErrors } from '@loopback/rest';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { Category, Users } from '../models';
import { CategoryRepository } from '../repositories';
import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';

export class CategoryUsersController {
  constructor(
    @repository(CategoryRepository)
    public categoryRepository: CategoryRepository,
  ) { }

  @get('/apis/categories/{_id}/users', {
    responses: {
      '200': {
        description: 'Users belonging to Category',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef(Users) },
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async getUsers(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_id') _id: typeof Category.prototype._id,
  ): Promise<Users> {
    currentUserProfile._id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];

    if (_id !== currentUserProfile._id) {
      throw new HttpErrors.Unauthorized('Token is not matched to this user _id!');
    }
    return this.categoryRepository.users(_id);
  }
}
