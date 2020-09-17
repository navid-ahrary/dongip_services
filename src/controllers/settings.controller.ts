import {inject} from '@loopback/core';
import {Count, repository} from '@loopback/repository';
import {get, getModelSchemaRef, requestBody, api, patch} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

import {Settings} from '../models';
import {SettingsRepository, UsersRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

@authenticate('jwt.access')
@api({basePath: '/', paths: {}})
export class SettingsController {
  readonly userId: number;

  constructor(
    @repository(SettingsRepository)
    public settingsRepository: SettingsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
  ) {
    this.userId = +this.currentUserProfile[securityId];
  }

  @get('/settings', {
    summary: 'GET Settings',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Settings model instances',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Settings, {includeRelations: false}),
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
    return this.usersRepository.setting(this.userId).patch(patchSettings);
  }
}
