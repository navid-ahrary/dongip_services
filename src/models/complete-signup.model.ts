import {Model, model, property} from '@loopback/repository';

@model()
export class CompleteSignup extends Model {
  @property({
    type: 'string',
  })
  name?: string;

  @property({
    type: 'string',
  })
  avatar?: string;

  @property({
    type: 'string',
  })
  currency?: string;

  @property({
    type: 'string',
  })
  language?: string;

  @property({
    type: 'string',
  })
  phone?: string;

  @property({
    type: 'string',
  })
  email?: string;

  constructor(data?: Partial<CompleteSignup>) {
    super(data);
  }
}

export interface CompleteSignupRelations {
  // describe navigational properties here
}

export type CompleteSignupWithRelations = CompleteSignup &
  CompleteSignupRelations;
