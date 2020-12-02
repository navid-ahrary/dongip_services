import { Model, model, property } from '@loopback/repository';

import { UsersRels } from './users-rels.model';

@model({ jsonSchema: { description: 'Joint Account Request model' } })
export class JointRequest extends Model {
  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      maxLength: 50,
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
      type: 'array',
      uniqueItems: true,
      minItems: 1,
      items: { type: 'number', minimum: 1 },
    },
  })
  userRelIds: typeof UsersRels.prototype.userRelId[];

  @property({
    type: 'boolean',
    default: true,
    jsonSchema: { default: true },
  })
  includeBill: boolean;

  constructor(data?: Partial<JointRequest>) {
    super(data);
  }
}

export interface JointRequestRelations {
  // describe navigational properties here
}

export type JointRequestWithRelations = JointRequest & JointRequestRelations;
