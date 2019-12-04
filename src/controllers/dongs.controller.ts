/* eslint-disable @typescript-eslint/no-floating-promises */
import {Filter, repository} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getModelSchemaRef,
  patch,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {Dong} from '../models';
import {DongsRepository, UsersRepository} from '../repositories';
import * as moment from 'moment';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {inject} from '@loopback/core';
import {authenticate, TokenService} from '@loopback/authentication';
import {TokenServiceBindings} from '../keys';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

export class DongsController {
  constructor(
    @repository(DongsRepository) public dongsRepository: DongsRepository,
    @repository(UsersRepository) public userRepository: UsersRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE) public jwtService: TokenService,
  ) {}

  @post('/dongs/create', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dongs model create',
        content: {'application/json': {schema: getModelSchemaRef(Dong)}},
      },
    },
  })
  @authenticate('jwt')
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dong, {
            title: 'NewDongs',
          }),
        },
      },
    })
    dong: Dong,
    @inject(SecurityBindings.USER) cashier: UserProfile,
  ): Promise<Dong['id']> {
    cashier.id = cashier[securityId];
    delete cashier[securityId];

    dong['createdAt'] = moment().format();
    const eqip = dong.eqip;
    const paidByList = dong.paidBy;

    try {
      const savedDong = await this.dongsRepository.create(dong);
      return savedDong.id;
    } catch (error) {
      throw new HttpErrors.UnprocessableEntity(error);
    }
  }

  @get('/dongs', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Dongs model instances',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Dong)},
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @param.query.object('filter', getFilterSchemaFor(Dong)) filter?: Filter<Dong>,
  ): Promise<Dong[]> {
    console.log(filter);
    return this.dongsRepository.find(filter);
  }

  @get('/dongs/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dong model instance',
        content: {'application/json': {schema: getModelSchemaRef(Dong)}},
      },
    },
  })
  @authenticate('jwt')
  async findById(@param.path.string('id') id: string): Promise<Dong> {
    return this.dongsRepository.findById(id);
  }

  @patch('/dongs/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Dongs PATCH success',
      },
    },
  })
  @authenticate('jwt')
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dong, {partial: true}),
        },
      },
    })
    dong: Dong,
  ): Promise<void> {
    await this.dongsRepository.updateById(id, dong);
  }
}
