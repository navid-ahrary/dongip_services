import { Model, model, property } from '@loopback/repository';
import { UsersRels } from './users-rels.model';

@model({ jsonSchema: { description: 'Joint Account Response model' } })
export class JointResponse extends Model {
  @property({
    type: 'number',
  })
  jointAccountId: number;

  @property({
    type: 'date',
  })
  createdAt: string;

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
    type: 'boolean',
    required: true,
  })
  admin: boolean;

  @property({
    jsonSchema: {
      type: 'array',
      uniqueItems: true,
      minItems: 2,
      items: { type: 'object', minimum: 1 },
    },
  })
  userRels: {
    userRelId?: typeof UsersRels.prototype.userRelId;
    name?: string;
    avatar?: string;
    type?: typeof UsersRels.prototype.type;
  }[];

  constructor(data?: Partial<JointResponse>) {
    super(data);
  }
}

export interface JointResponseRelations {
  // describe navigational properties here
}

export type JointResponseWithRelations = JointResponse & JointResponseRelations;
