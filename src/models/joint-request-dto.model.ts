import { Model, model, property } from '@loopback/repository';
import { UsersRels } from './users-rels.model';

@model({ jsonSchema: { description: 'Joint Account Request model' } })
export class JointRequestDto extends Model {
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
    type: 'array',
    itemType: 'number',
  })
  userRelIds: typeof UsersRels.prototype.userRelId[];

  @property({
    type: 'boolean',
    required: false,
    jsonSchema: { default: false },
  })
  family: boolean;

  constructor(data?: Partial<JointRequestDto>) {
    super(data);
  }
}

export interface JointRequestDtoRelations {
  // describe navigational properties here
}

export type JointRequestDtoWithRelations = JointRequestDto & JointRequestDtoRelations;
