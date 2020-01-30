import { model, property, Model } from '@loopback/repository';

@model()
export class FriendRequest extends Model {
  @property({
    type: 'string',
    required: true,
  })
  phone: string;

  @property({
    type: 'string',
    required: true
  })
  requesterKey: string;

  @property({
    type: 'string',
    required: true
  })
  avatar: string;

  @property({
    required: true,
    type: 'string',
  })
  alias: string;

  @property({
    type: 'string',
    required: true,
  })
  relationKey: string;

  @property({
    type: 'boolean',
    required: true,
  })
  status: boolean;

  constructor(data?: Partial<FriendRequest>) {
    super(data);
  }
}

export interface FriendRequestRelations { }

export type FriendRequestWithRelations = FriendRequest & FriendRequestRelations;
