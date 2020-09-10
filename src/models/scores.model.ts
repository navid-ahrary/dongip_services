import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Users} from './users.model';

@model({
  name: 'scores',
  settings: {
    foreignKeys: {
      fkScoresUserId: {
        name: 'fk_scores_user_id',
        entity: 'users',
        entityKey: 'id',
        foreignKey: 'userId',
        onUpdate: 'restrict',
        onDelete: 'cascade',
      },
    },
  },
})
export class Scores extends Entity {
  @property({
    type: 'Number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'id',
      dataType: 'int',
      dataLength: null,
      nullable: 'N',
    },
  })
  scoreId?: number;

  @property({
    type: 'string',
    required: true,
    mysql: {
      dataType: 'varchar',
      dataLength: 10,
      nullable: 'N',
    },
  })
  origin: string;

  @property({
    type: 'Number',
    required: true,
    jsonSchema: {maxLength: 3},
    mysql: {
      dataType: 'smallint',
      dataLength: 3,
      nullable: 'N',
    },
  })
  score: number;

  @property({
    type: 'date',
    required: true,
    mysql: {
      columnName: 'created_at',
      dataType: 'datetime',
      dataLength: null,
      nullable: 'N',
    },
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
    {
      type: 'Number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint',
        dataLength: null,
        nullable: 'N',
      },
    },
  )
  userId: number;

  constructor(data?: Partial<Scores>) {
    super(data);
  }
}

export interface ScoresRelations {}

export type ScoresWithRelations = Scores & ScoresRelations;
