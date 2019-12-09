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
import {Dongs} from '../models';
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

  @post('/apis/dongs/create', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dongs model create',
        content: {'application/json': {schema: getModelSchemaRef(Dongs)}},
      },
    },
  })
  @authenticate('jwt')
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Dongs, {
            title: 'NewDongs',
          }),
        },
      },
    })
    dong: Dongs,
    @inject(SecurityBindings.USER) cashier: UserProfile,
  ): Promise<Dongs['id']> {
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

  @get('/apis/dongs', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Dongs model instances',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Dongs)},
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @param.query.object('filter', getFilterSchemaFor(Dongs)) filter?: Filter<Dongs>,
  ): Promise<Dongs[]> {
    console.log(filter);
    return this.dongsRepository.find(filter);
  }

  @get('/apis/dongs/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dong model instance',
        content: {'application/json': {schema: getModelSchemaRef(Dongs)}},
      },
    },
  })
  @authenticate('jwt')
  async findById(@param.path.string('id') id: string): Promise<Dongs> {
    return this.dongsRepository.findById(id);
  }

  @patch('/apis/dongs/{id}', {
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
          schema: getModelSchemaRef(Dongs, {partial: true}),
        },
      },
    })
    dong: Dongs,
  ): Promise<void> {
    await this.dongsRepository.updateById(id, dong);
  }
}
