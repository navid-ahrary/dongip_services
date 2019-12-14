import {Entity, model, property, hasMany} from '@loopback/repository';
import {Dongs, DongsWithRelations} from './dongs.model';
import {VirtualUsers, VirtualUsersWithRelations} from './virtual-users.model';

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
    required: true,
  })
  geolocation: string;

  @property({
    type: 'date',
    required: false,
  })
  registeredAt: string;

  @property({
    type: 'string',
    required: true,
  })
  accountType: string;

  @property({
    type: 'string',
  })
  notifToken: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  categories: string[];

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
  friends: Users['id'][];

  @hasMany(() => Dongs)
  dongs: Dongs[];

  @hasMany(() => VirtualUsers)
  virtualUsers: VirtualUsers[];

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  virtualUsers?: VirtualUsersWithRelations[];
  dongs?: DongsWithRelations[];
}

export type UsersWithRelations = Users & UsersRelations;
