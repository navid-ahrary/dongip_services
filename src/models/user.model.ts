import {Entity, model, property} from '@loopback/repository';
import {v4 as uuid} from 'uuid';

@model()
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    required: false,
  })
  id: string = uuid();

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
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    reuired: false,
  })
  locale: string;

  @property({
    type: 'string',
    required: false,
  })
  geolocation: string;

  @property({
    type: 'date',
    required: false,
  })
  registeredAt: 'string';

  @property({
    type: 'string',
    required: true,
  })
  accountType: string;

  // @property({
  //   type: 'date',
  //   required: true,
  // })
  // createdDate: string;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
