import { Model, model, property } from '@loopback/repository';
import { UsersRels } from './users-rels.model';

@model()
export class UserRel extends Model {
  @property({ type: 'number' })
  userRelId?: typeof UsersRels.prototype.userRelId;

  @property({ type: 'string' })
  name?: string;

  @property({ type: 'string' })
  avatar?: string;

  @property({ type: 'string' })
  type?: typeof UsersRels.prototype.type;

  constructor(data?: Partial<UserRel>) {
    super(data);
  }
}

@model({ jsonSchema: { description: 'Joint Account Response model' } })
export class JointResponseDto extends Model {
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
    type: 'boolean',
    required: true,
  })
  family: boolean;

  @property({
    type: 'string',
    required: true,
  })
  type: string;

  @property({
    jsonSchema: {
      type: 'array',
      uniqueItems: true,
      minItems: 2,
      items: {
        type: 'object',
        minimum: 1,
      },
    },
  })
  userRels: UserRel[];

  constructor(data?: Partial<JointResponseDto>) {
    super(data);
  }
}

export interface JointResponseDtoRelations {
  // describe navigational properties here
}

export type JointResponseDtoWithRelations = JointResponseDto & JointResponseDtoRelations;
