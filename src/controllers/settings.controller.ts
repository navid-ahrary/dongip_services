import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import { get, getModelSchemaRef, patch, requestBody } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { Settings, Users } from '../models';
import { SettingsRepository, UsersRepository } from '../repositories';
import { CurrentUserProfile } from '../services';

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
    const set = await this.settingsRepository.findOne({
      where: { deleted: false, userId: this.userId },
    });
    return set!;
  }

  @patch('/settings', {
    summary: 'PATCH Settings',
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
            exclude: ['userId', 'createdAt', 'deleted'],
          }),
        },
      },
    })
    patchSettings: Settings,
  ): Promise<void> {
    await this.usersRepository.setting(this.userId).patch(patchSettings);
  }
}
