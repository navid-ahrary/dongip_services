import { authenticate } from '@loopback/authentication';
import { inject } from '@loopback/context';
import { Count, CountSchema, repository } from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  RequestContext,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import _ from 'lodash';
import { LocMsgsBindings } from '../keys';
import { Users, Wallets } from '../models';
import { UsersRepository, WalletsRepository } from '../repositories';
import { CurrentUserProfile } from '../services';
import { LocalizedMessages } from '../types';

@authenticate('jwt.access')
export class WalletsController {
  private readonly userId: typeof Users.prototype.userId;
  private readonly lang: string;

  constructor(
    @inject.context() public ctx: RequestContext,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @repository(UsersRepository) public userRepo: UsersRepository,
    @repository(WalletsRepository) public walletsRepository: WalletsRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @post('/wallets', {
    summary: 'Create a Wallet',
    description: 'Wallets model instance',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: getModelSchemaRef(Wallets),
          },
        },
      },
    },
  })
  async createWallets(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Wallets, {
            title: 'NewWallets',
            exclude: ['walletId', 'userId', 'createdAt', 'updatedAt', 'deleted'],
          }),
        },
      },
    })
    wallets: Omit<Wallets, 'walletId'>,
  ): Promise<Wallets> {
    return this.userRepo.wallets(this.userId).create(wallets);
  }

  @get('/wallets', {
    summary: 'Get all Wallets',
    responses: {
      200: {
        description: 'Array of Wallets model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Wallets, { includeRelations: false }),
            },
          },
        },
      },
    },
  })
  async findWallets(): Promise<Wallets[]> {
    return this.userRepo.wallets(this.userId).find({ where: { deleted: false } });
  }

  @patch('/wallets/{walletId}', {
    summary: 'Update a Wallet by walletId',
    responses: { 204: { description: 'Wallets PATCH success' } },
  })
  async updateWalletsByWalletId(
    @param.path.number('walletId') walletId: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Wallets, {
            partial: true,
            exclude: ['createdAt', 'updatedAt', 'walletId', 'initial', 'userId', 'deleted'],
          }),
        },
      },
    })
    wallets: Wallets,
  ): Promise<void> {
    try {
      const countUpdated = await this.walletsRepository.updateAll(
        { ...wallets, updatedAt: new Date().toISOString() },
        { userId: this.userId, walletId: walletId },
      );

      if (countUpdated.count === 0) throw new Error('wlletId not valid');
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  @del('/wallets/{walletId}', {
    summary: 'Delete a Wallet by walletId',
    responses: { 204: { description: 'Wallets DELETE success' } },
  })
  async deleteById(
    @param.path.number('walletId') walletId: number,
    @param.query.number('walletIdUpdate', { required: false }) walletIdUpdate?: number,
    @param.query.boolean('deleteDongs', { required: false }) deleteDongs?: boolean,
  ): Promise<void> {
    if (walletIdUpdate) {
      await this.userRepo
        .dongs(this.userId)
        .patch({ walletId: walletIdUpdate }, { walletId: walletId });
    } else if (deleteDongs) {
      await this.walletsRepository
        .dongs(walletId)
        .patch({ deleted: true }, { userId: this.userId });
    }

    const countDeleted = await this.userRepo
      .wallets(this.userId)
      .patch({ deleted: true }, { walletId: walletId });

    if (countDeleted.count === 0) {
      throw new HttpErrors.UnprocessableEntity('wlletId not valid');
    }
  }

  @del('/wallets/', {
    summary: 'Delete all Wallets',
    responses: {
      200: {
        description: 'Wallets DELETE success',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async deleteAllWallets(
    @param.query.boolean('deleteDongs', { required: false }) deleteDongs?: boolean,
  ): Promise<Count> {
    if (deleteDongs) {
      await this.userRepo.dongs(this.userId).patch({ deleted: true }, { walletId: { neq: null! } });
    }

    return this.userRepo.wallets(this.userId).patch({ deleted: true });
  }
}
