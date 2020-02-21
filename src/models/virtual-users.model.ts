import { Entity, model, property, belongsTo, hasMany } from '@loopback/repository'
import {
  Users,
  UsersRels,
  Category,
  CategoryBill,
  Dongs
} from './'

@model()
export class VirtualUsers extends Entity {
  @property( {
    type: 'string',
    id: true,
    generated: true,
    required: false,
  } )
  _key: string

  @property( {
    type: 'string',
    required: false,
    generated: true
  } )
  _id: string

  @property( {
    type: 'string',
    required: false,
    generated: true
  } )
  _rev: string

  @property( {
    type: 'string',
    required: true,
  } )
  phone: string

  @belongsTo( () => Users, { name: 'belongsToUser' } )
  belongsToUserId: string

  @hasMany( () => Dongs, { keyTo: 'xManKey' } )
  dongs: Dongs[]

  @hasMany( () => Category, { keyTo: 'belongsToUserId' } )
  categories: Category[]

  @hasMany( () => UsersRels, { keyTo: '_from' } )
  usersRels: UsersRels[]

  @hasMany( () => CategoryBill, { keyTo: '_to' } )
  categoryBills: CategoryBill[]

  constructor ( data?: Partial<VirtualUsers> ) {
    super( data )
  }
}

export interface VirtualUsersRelations {
}

export type VirtualUsersWithRelations = VirtualUsers & VirtualUsersRelations
