import { model, property } from '@loopback/repository';
import { Users } from './users.model';
import { LanguageEnum, CurrencyEnum } from './settings.model';

@model()
export class NewUser extends Users {
  @property({ type: 'string', required: true, length: 9 }) password: string;

  @property({
    type: 'string',
    default: 'fa',
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
    default: 'IRR',
    jsonSchema: {
      minLength: 3,
      maxLength: 3,
      description: 'ISO 4217',
      enum: Object.values(CurrencyEnum),
    },
  })
  currency?: string;
}

export interface NewUserRelations {
  // describe navigational properties here
}

export type NewUserWithRelations = NewUser & NewUserRelations;
