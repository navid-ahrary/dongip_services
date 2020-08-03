import {Entity, model, property} from '@loopback/repository';

@model({name: 'links'})
export class Links extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
    mysql: {
      dataType: 'varchar',
      dataLength: 50,
      nullable: 'N',
    },
  })
  name: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {maxLength: 512},
    mysql: {
      dataType: 'varchar',
      dataLength: 512,
      nullable: 'N',
    },
  })
  url: string;

  constructor(data?: Partial<Links>) {
    super(data);
  }
}

export interface LinksRelations {
  // describe navigational properties here
}

export type LinksWithRelations = Links & LinksRelations;
