import {Entity, model, property} from '@loopback/repository';

@model()
export class Navid extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'date',
  })
  date?: string;


  constructor(data?: Partial<Navid>) {
    super(data);
  }
}

export interface NavidRelations {
  // describe navigational properties here
}

export type NavidWithRelations = Navid & NavidRelations;
