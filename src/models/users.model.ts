import { Entity, model, property, hasMany } from '@loopback/repository'
import { VirtualUsers } from './virtual-users.model'
import { Dongs } from './dongs.model'
import { Category } from './category.model'
import { UsersRels } from './users-rels.model'
import { CategoryBill } from './category-bill.model'

@model()
export class Users extends Entity {
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
    required: false
  } )
  accountType: string

  @property( {
    type: 'string',
    reqiured: true,
  } )
  registerationToken: string

  @property( {
    type: 'string',
    reqiured: true,
  } )
  userAgent: string

  @property( {
    type: 'array',
    itemType: 'string',
    required: false,
    default: [],
  } )
  dongsId: string[]

  @hasMany( () => VirtualUsers, { keyTo: 'belongsToUserKey' } )
  virtualUsers: VirtualUsers[]

  @hasMany( () => Dongs, { keyTo: 'belongsToUserKey' } )
  dongs: Dongs[]

  @hasMany( () => Category, { keyTo: 'belongsToUserKey' } )
  categories: Category[]

  @hasMany( () => UsersRels, { keyTo: 'belongsToUserKey' } )
  usersRels: UsersRels[]

  @hasMany( () => CategoryBill, { keyTo: 'belongsToUserKey' } )
  categoryBills: CategoryBill[]

  constructor ( data?: Partial<Users> ) {
    super( data )
  }
}

export interface UsersRelations {
}

export type UsersWithRelations = Users & UsersRelations
