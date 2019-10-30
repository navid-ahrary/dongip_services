import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: false}})
export class Users extends Entity {
  @property({
    type: 'string',
    required: true,
    id: true,
    generated: false,
  })
  phoneNumber: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'date',
    required: true,
  })
  createdDate: string;

  @property({
    type: 'string',
    required: true,
  })
  accountType: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  // describe navigational properties here
}

export type UsersWithRelations = Users & UsersRelations;
