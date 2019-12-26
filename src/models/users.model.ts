import {Entity, model, property, hasMany} from '@loopback/repository';
import {Dongs, DongsWithRelations} from './dongs.model';
import {VirtualUsers, VirtualUsersWithRelations} from './virtualUsers.model';
import {Categories} from './categories.model';

@model()
export class Users extends Entity {
  @property({
    type: 'string',
    id: true,
    required: false,
    generated: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  phone: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    default: '',
    required: true,
  })
  avatar: string;

  @property({
    type: 'string',
    required: false,
  })
  locale: string;

  @property({
    type: 'string',
    required: false,
  })
  geolocation: string;

  @property({
    type: 'date',
    required: false,
  })
  registeredAt: string;

  @property({
    type: 'string',
  })
  accountType: string;

  @property({
    type: 'string',
    reqiured: true,
  })
  deviceToken: string;

  @property({
    type: 'array',
    itemType: 'object',
    default: [],
    required: false,
  })
  pendingFriends: {recipient: string; requester: string}[];

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
    required: false,
  })
  friends: typeof Users.prototype.id[];

  @hasMany(() => Dongs, {keyTo: 'id'})
  dongs: Dongs[];

  @hasMany(() => VirtualUsers, {keyTo: 'id'})
  virtualUsers: VirtualUsers[];

  @hasMany(() => Categories, {keyTo: 'id'})
  categories: Categories[];

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  dongs?: DongsWithRelations;
  virtualUsers?: VirtualUsersWithRelations;
}

export type UsersWithRelations = Users & UsersRelations;
