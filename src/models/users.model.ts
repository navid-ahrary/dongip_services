import {Entity, model, property, hasMany} from '@loopback/repository';
import {Dongs} from './dongs.model';
import {VirtualFriends} from './virtual-friends.model';

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
    type: 'array',
    itemType: 'object',
    default: [],
    required: false,
  })
  pendingFriendIds: {recipient: string; requester: string}[];

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
    required: false,
  })
  friendIds: Users['id'][];

  @hasMany(() => VirtualFriends, {keyTo: 'sourceUserId'})
  virtualFriends?: VirtualFriends[];

  @hasMany(() => Dongs)
  dongs?: Dongs['id'][];

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  // describe navigational properties here
}

export type UsersWithRelations = Users & UsersRelations;
