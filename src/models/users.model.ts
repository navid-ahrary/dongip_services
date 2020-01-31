import { Entity, model, property, hasMany } from '@loopback/repository'
import { VirtualUsers, VirtualUsersWithRelations } from './virtual-users.model'
import { Dongs } from './dongs.model'
import { Category } from './category.model'
import { UsersRels } from './users-rels.model'

@model()
export class Users extends Entity
{
  @property( {
    type: 'string',
    id: true,
    required: false,
    generated: true,
  } )
  _key: string

  @property( {
    type: 'string',
    required: false,
    generated: true,
  } )
  _id: string

  @property( {
    type: 'string',
    required: false,
    generated: true,
  } )
  _rev: string

  @property( {
    type: 'string',
    required: true,
  } )
  phone: string

  @property( {
    type: 'string',
    required: true,
  } )
  password: string

  @property( {
    type: 'string',
    required: true,
  } )
  name: string

  @property( {
    type: 'string',
    default: '',
    required: true,
  } )
  avatar: string

  @property( {
    type: 'string',
    required: false,
  } )
  locale: string

  @property( {
    type: 'string',
    required: false,
  } )
  geolocation: string

  @property( {
    type: 'date',
    required: false,
  } )
  registeredAt: string

  @property( {
    type: 'string',
  } )
  accountType: string

  @property( {
    type: 'string',
    reqiured: true,
  } )
  registerationToken: string

  @property( {
    type: 'array',
    itemType: 'object',
    default: [],
    required: false,
  } )
  pendingFriends: { recipient: string; requester: string }[]

  @property( {
    type: 'array',
    itemType: 'string',
    default: [],
    required: false,
  } )
  friends: typeof Users.prototype._key[]

  @property( {
    type: 'array',
    itemType: 'string',
    default: [],
    required: false,
  } )
  virtualFriends: string[]

  @hasMany( () => VirtualUsers )
  virtualUsers: VirtualUsers[]

  @property( {
    type: 'array',
    itemType: 'string',
    required: false,
    default: [],
  } )
  dongsId: typeof Dongs.prototype._key[]

  @hasMany( () => Dongs, { keyTo: 'exManKey' } )
  dongs: Dongs[]

  @hasMany( () => Category )
  categories: Category[]

  @hasMany( () => UsersRels )
  usersRels: UsersRels[]

  constructor ( data?: Partial<Users> )
  {
    super( data )
  }
}

export interface UsersRelations
{
  virtualUsers?: VirtualUsersWithRelations
}

export type UsersWithRelations = Users & UsersRelations
