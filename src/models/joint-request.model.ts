import {Model, model, property} from '@loopback/repository';

import {UsersRels} from './users-rels.model';

@model({jsonSchema: {description: 'Joint Account Request model'}})
export class JointRequest extends Model {
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
      description: 'For now just a joint account with 2 subscriber is allowed',
      type: 'array',
      uniqueItems: true,
      minItems: 2,
      maxItems: 2,
      items: {type: 'number', minimum: 1},
    },
  })
  userRelIds: typeof UsersRels.prototype.userRelId[];

  constructor(data?: Partial<JointRequest>) {
    super(data);
  }
}

export interface JointRequestRelations {
  // describe navigational properties here
}

export type JointRequestWithRelations = JointRequest & JointRequestRelations;
