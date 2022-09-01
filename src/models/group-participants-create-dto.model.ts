import { Model, model, property } from '@loopback/repository';

@model()
export class GroupParticipantsCreateDto extends Model {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
  })
  phone: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  constructor(data?: Partial<GroupParticipantsCreateDto>) {
    super(data);
  }
}
