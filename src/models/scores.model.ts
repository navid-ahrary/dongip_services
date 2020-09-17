import {
  Entity,
  model,
  property,
  belongsTo,
  RelationType,
} from '@loopback/repository';
import {Users} from './users.model';
import {Dongs} from './dongs.model';

@model({
  name: 'scores',
  settings: {
    // foreignKeys: {
    //   fkScoresUserId: {
    //     name: 'fk_scores_user_id',
    //     entity: 'users',
    //     entityKey: 'id',
    //     foreignKey: 'userId',
    //     onUpdate: 'restrict',
    //     onDelete: 'cascade',
    //   },
    //   fkScoresDongId: {
    //     name: 'fk_scores_dong_id',
    //     entity: 'dongs',
    //     entityKey: 'id',
    //     foreignKey: 'dongId',
    //     onUpdate: 'restrict',
    //     onDelete: 'cascade',
    //   },
    // },
  },
})
export class Scores extends Entity {
  @property({
    type: 'number',
    id: true,
    required: false,
    generated: true,
    mysql: {
      columnName: 'score_id',
      dataType: 'mediumint unsigned',
      dataLength: 8,
      nullable: 'N',
    },
  })
  scoreId?: number;

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
    required: false,
    defaultFn: 'now',
    mysql: {
      columnName: 'created_at',
      dataType: 'timestamp',
      dataLength: null,
      nullable: 'N',
      default: 'now',
    },
  })
  createdAt?: string;

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
      type: 'number',
      required: true,
      index: {normal: true},
      mysql: {
        columnName: 'user_id',
        dataType: 'mediumint unsigned',
        nullable: 'N',
      },
    },
  )
  userId: number;

  @belongsTo(
    () => Dongs,
    {
      type: RelationType.belongsTo,
      keyFrom: 'dongId',
      keyTo: 'dongId',
      name: 'dong',
      source: Dongs,
      target: () => Scores,
    },
    {
      type: 'number',
      index: {normal: true},
      mysql: {
        columnName: 'dong_id',
        dataType: 'mediumint unsigned',
        nullable: 'Y',
      },
    },
  )
  dongId: number;

  constructor(data?: Partial<Scores>) {
    super(data);
  }
}

export interface ScoresRelations {}

export type ScoresWithRelations = Scores & ScoresRelations;
