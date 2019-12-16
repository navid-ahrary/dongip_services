import {Entity, model, property, belongsTo, hasMany} from '@loopback/repository';
import {Users, UsersWithRelations} from './users.model';
import {Dongs, DongsWithRelations} from './dongs.model';

@model()
export class VirtualUsers extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    required: false,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  phone: string;

  @property({
    type: 'string',
    required: true,
  })
  avatar: string;

  @belongsTo(() => Users)
  usersId: typeof Users.prototype.id;

  @hasMany(() => Dongs)
  dongs: Dongs[];

  constructor(data?: Partial<VirtualUsers>) {
    super(data);
  }
}

export interface VirtualUsersRelations {
  usersId?: UsersWithRelations;
  dongs?: DongsWithRelations;
}

export type VirtualUsersWithRelations = VirtualUsers & VirtualUsersRelations;
