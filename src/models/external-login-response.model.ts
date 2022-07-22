import { Model, model, property } from '@loopback/repository';

@model()
export class ExternalLoginResponse extends Model {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  email: string;

  @property({
    type: 'string',
    required: true,
  })
  avatar: string;

  constructor(data?: Partial<ExternalLoginResponse>) {
    super(data);
  }
}

export interface ExternalLoginResponseRelations {
  // describe navigational properties here
}

export type ExternalLoginResponseWithRelations = ExternalLoginResponse &
  ExternalLoginResponseRelations;
