import {Model, model, property} from '@loopback/repository';

@model()
export class Node extends Model {
  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  avatar: string;


  constructor(data?: Partial<Node>) {
    super(data);
  }
}

export interface NodeRelations {
  // describe navigational properties here
}

export type NodeWithRelations = Node & NodeRelations;
