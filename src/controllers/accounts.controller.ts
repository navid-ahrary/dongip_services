/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject } from '@loopback/context';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import { repository } from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { Accounts, Users } from '../models';
import { UsersRepository } from '../repositories';
import { basicAuthorization, CurrentUserProfile } from '../services';

@authenticate('jwt.access')
@authorize({ allowedRoles: ['GOLD'], voters: [basicAuthorization] })
export class AccountsController {
  private readonly userId: typeof Users.prototype.userId;

  constructor(
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @inject(SecurityBindings.USER) currentUserProfile: CurrentUserProfile,
    @repository(UsersRepository) private userRepo: UsersRepository,
  ) {
    this.userId = +currentUserProfile[securityId];
  }

  @post('/accounts')
  @response(200, {
    description: 'Accounts model instance',
    content: {
      'application/json': { schema: getModelSchemaRef(Accounts) },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Accounts, {
            title: 'NewAccounts',
            exclude: ['accountId', 'userId', 'deleted', 'createdAt', 'isPrimary'],
          }),
        },
      },
    })
    accounts: Omit<Accounts, 'accountId'>,
  ): Promise<Accounts> {
    try {
      const savedAccount = await this.userRepo.accounts(this.userId).create(accounts);
      return savedAccount;
    } catch (err) {
      this.logger.log('error', err.message);
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  @get('/accounts')
  @response(200, {
    description: 'Array of Accounts model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Accounts, { includeRelations: false, exclude: ['deleted'] }),
        },
      },
    },
  })
  async find(): Promise<Accounts[]> {
    try {
      const foundAccounts = await this.userRepo.accounts(this.userId).find({
        where: { deleted: false },
      });
      return foundAccounts;
    } catch (err) {
      this.logger.log('error', err.message);
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  @patch('/accounts/{accountId}')
  @response(204, {
    description: 'Accounts PATCH success',
  })
  updateById(
    @param.path.number('accountId') accountId: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Accounts, {
            partial: true,
            exclude: ['accountId', 'userId', 'deleted', 'createdAt'],
          }),
        },
      },
    })
    accounts: Accounts,
  ): void {
    try {
      this.userRepo.accounts(this.userId).patch(accounts, {
        accountId: accountId,
        deleted: false,
      });
    } catch (err) {
      this.logger.log('error', err.message);
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  @del('/accounts/{accountId}')
  @response(204, {
    description: 'Accounts DELETE success',
  })
  deleteById(@param.path.number('accountId') accountId: number): void {
    try {
      this.userRepo.accounts(this.userId).patch({ deleted: true }, { accountId: accountId });
    } catch (err) {
      this.logger.log('error', err.message);
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }
}
