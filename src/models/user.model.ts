import {Entity, model, property} from '@loopback/repository';

@model()
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    required: false,
    generated: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  phone: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'string',
    required: false,
  })
  token: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    reuired: true,
  })
  locale: string;

  @property({
    type: 'string',
    required: true,
  })
  geolocation: string;

  @property({
    type: 'date',
  })
  registeredAt?: string;

  @property({
    type: 'string',
    required: true,
  })
  accountType: string;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
