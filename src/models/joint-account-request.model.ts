import {Model, model, property} from '@loopback/repository';

import {UsersRels} from './users-rels.model';

@model({jsonSchema: {description: 'Joint Account'}})
export class JointAccountRequest extends Model {
  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      maxLength: 20,
    },
  })
  title: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      maxLength: 100,
    },
  })
  description: string;

  @property({
    jsonSchema: {
      description:
        'Self user rel should included if user desires to subscribing in joint account',
      type: 'array',
      uniqueItems: true,
      items: {type: 'number', minimum: 1},
    },
  })
  userRelIds: typeof UsersRels.prototype.userRelId[];

  constructor(data?: Partial<JointAccountRequest>) {
    super(data);
  }
}

export interface JointAccountRequestRelations {
  // describe navigational properties here
}

export type JointAccountRequestWithRelations = JointAccountRequest &
  JointAccountRequestRelations;
