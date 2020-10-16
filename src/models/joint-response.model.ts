import {model, property} from '@loopback/repository';

import {JointRequest} from './joint-request.model';

@model({jsonSchema: {description: 'Joint Account Response model'}})
export class JointResponse extends JointRequest {
  @property({
    type: 'number',
  })
  jointAccountId: number;

  @property({
    type: 'date',
  })
  createdAt: string;

  constructor(data?: Partial<JointResponse>) {
    super(data);
  }
}

export interface JointResponseRelations {
  // describe navigational properties here
}

export type JointResponseWithRelations = JointResponse & JointResponseRelations;
