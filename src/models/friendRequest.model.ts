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
  })
  avatar?: string;

  @property({
    type: 'string',
  })
  name?: string;

  @property({
    type: 'boolean',
  })
  status?: boolean;

  constructor(data?: Partial<FriendRequest>) {
    super(data);
  }
}

export interface FriendRequestRelations { }

export type FriendRequestWithRelations = FriendRequest & FriendRequestRelations;
