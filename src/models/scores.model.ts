import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Users} from './users.model';

@model()
export class Scores extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  scoreId?: number;

  @property({
    type: 'string',
    required: true,
  })
  desc: string;

  @property({
    type: 'number',
    required: true,
  })
  score: number;

  @property({
    type: 'date',
    required: true,
  })
  createdAt: string;

  @belongsTo(
    () => Users,
    {
      type: RelationType.belongsTo,
      keyFrom: 'userId',
      keyTo: 'userId',
      name: 'user',
      source: Users,
      target: () => Scores,
    },
    {type: 'number', required: true},
  )
  userId: number;

  constructor(data?: Partial<Scores>) {
    super(data);
  }
}

export interface ScoresRelations {}

export type ScoresWithRelations = Scores & ScoresRelations;
