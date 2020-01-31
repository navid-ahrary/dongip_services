import { model, property, Model } from '@loopback/repository'

@model()
export class FriendRequest extends Model
{
  @property( {
    type: 'string',
    required: true,
  } )
  phone: string

  @property( {
    type: 'string',
    required: true
  } )
  avatar: string

  @property( {
    required: true,
    type: 'string',
  } )
  alias: string

  @property( {
    type: 'string',
    required: true
  } )
  requesterId: string

  @property( {
    type: 'string',
    required: true,
  } )
  relationId: string

  @property( {
    required: true,
    type: 'string',
  } )
  virtualUserId: string

  @property( {
    type: 'boolean',
    required: true,
  } )
  status: boolean

  constructor ( data?: Partial<FriendRequest> )
  {
    super( data )
  }
}

export interface FriendRequestRelations { }

export type FriendRequestWithRelations = FriendRequest & FriendRequestRelations
