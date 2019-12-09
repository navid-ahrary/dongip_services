import {Entity, model, property} from '@loopback/repository';
import {Users} from './users.model';

@model()
export class VirtualFriends extends Entity {
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

  @property({
    type: 'number',
    require: true,
  })
  status: number;

  @property({
    type: 'string',
    required: false,
  })
  sourceUserId: Users['id'];

  constructor(data?: Partial<VirtualFriends>) {
    super(data);
  }
}

export interface VirtualFriendsRelations {
  // describe navigational properties here
}

export type VirtualFriendsWithRelations = VirtualFriends & VirtualFriendsRelations;
