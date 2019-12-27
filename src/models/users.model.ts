import {Entity, model, property, hasMany} from '@loopback/repository';
import {VirtualUsers, VirtualUsersWithRelations} from './virtualUsers.model';
import {Dongs} from './dongs.model';
import {Category} from './category.model';

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
  registerationToken: string;

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

  @property({
    type: 'array',
    itemType: 'string',
    default: [],
    required: false,
  })
  virtualFriends: string[];

  @hasMany(() => VirtualUsers)
  virtualUsers: VirtualUsers[];

  @property({
    type: 'array',
    itemType: 'string',
    required: false,
    default: [],
  })
  dongsId: typeof Dongs.prototype.id[];

  @hasMany(() => Dongs, {keyTo: 'expensesManagerId'})
  dongs: Dongs[];

  @hasMany(() => Category)
  categories: Category[];

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  virtualUsers?: VirtualUsersWithRelations;
}

export type UsersWithRelations = Users & UsersRelations;
