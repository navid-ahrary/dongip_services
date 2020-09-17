import {Model, model, property} from '@loopback/repository';
import {CurrencyEnum, LanguageEnum} from './settings.model';

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
      enum: Object.values(LanguageEnum),
    },
  })
  language?: LanguageEnum;

  @property({
    type: 'string',
    jsonSchema: {
      minLength: 3,
      maxLength: 3,
      description: 'ISO 4217',
      enum: Object.values(CurrencyEnum),
    },
  })
  currency?: CurrencyEnum;

  @property({
    type: 'string',
    jsonSchema: {minLength: 10, maxLength: 20},
  })
  phone?: string;

  @property({
    type: 'string',
    jsonSchema: {
      maxLength: 100,
      format: 'email',
      pattern: '^w+@[a-zA-Z_]+?.[a-zA-Z]{2,3}$',
    },
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
