import {Model, model, property} from '@loopback/repository';

@model()
export class Credentials extends Model {
  @property({
    type: 'string',
    jsonSchema: {minLength: 10, maxLength: 20},
  })
  phone?: string;

  @property({
    type: 'string',
    jsonSchema: {maxLength: 100},
  })
  email?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {minLength: 9, maxLength: 9},
  })
  password: string;

  constructor(data?: Partial<Credentials>) {
    super(data);
  }
}

export interface CredentialsRelations {}

export type CredentialsWithRelations = Credentials & CredentialsRelations;
