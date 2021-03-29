import { inject } from '@loopback/core';
import { Count, repository } from '@loopback/repository';
import { get, getModelSchemaRef, requestBody, patch } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { authenticate } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC } from '@loopback/authentication-jwt';
import { Settings, Users } from '../models';
import { SettingsRepository, UsersRepository } from '../repositories';
import { CurrentUserProfile } from '../interfaces';

@authenticate('jwt.access')
export class SettingsController {
  private readonly userId: typeof Users.prototype.userId;

  constructor(
    @repository(SettingsRepository) public settingsRepository: SettingsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
  ) {
    this.userId = +currentUserProfile[securityId];
  }

  @get('/settings', {
    summary: 'GET Settings',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Settings model instances',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Settings, { includeRelations: false }),
          },
        },
      },
    },
  })
  async findSettings(): Promise<Settings> {
    return this.usersRepository.setting(this.userId).get();
  }

  @patch('/settings', {
    summary: 'PATCH Settings',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Settings PATCH success. No content',
      },
    },
  })
  async updateSettings(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Settings, {
            partial: true,
            exclude: ['userId', 'createdAt'],
          }),
        },
      },
    })
    patchSettings: Settings,
  ): Promise<Count> {
    await this.usersRepository.setting(this.userId).patch(patchSettings);
  }
}
