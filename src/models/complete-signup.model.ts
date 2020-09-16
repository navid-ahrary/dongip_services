import {Model, model, property} from '@loopback/repository';

@model()
export class CompleteSignup extends Model {
  @property({
    type: 'string',
    jsonSchema: {minLength: 3, maxLength: 30},
  })
  name?: string;

  @property({
    type: 'string',
    jsonSchema: {minLength: 3, maxLength: 512},
  })
  avatar?: string;

  @property({
    type: 'string',
    jsonSchema: {
      minLength: 2,
      maxLength: 2,
      description: 'ISO 639-1',
    },
  })
  language?: string;

  @property({
    type: 'string',
    jsonSchema: {
      minLength: 3,
      maxLength: 3,
      description: 'ISO 4217',
    },
  })
  currency?: string;

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

  constructor(data?: Partial<CompleteSignup>) {
    super(data);
  }
}

export interface CompleteSignupRelations {
  // describe navigational properties here
}

export type CompleteSignupWithRelations = CompleteSignup &
  CompleteSignupRelations;
