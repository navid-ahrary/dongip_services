import {Entity, model, property} from '@loopback/repository';

@model()
export class Node extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;


  constructor(data?: Partial<Node>) {
    super(data);
  }
}

export interface NodeRelations {
  // describe navigational properties here
}

export type NodeWithRelations = Node & NodeRelations;
