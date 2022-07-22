import { Model, model, property } from '@loopback/repository';

@model()
export class ExternalLoginDto extends Model {
  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: ['apple', 'google'],
    },
  })
  provider: string;

  @property({
    type: 'string',
    required: true,
  })
  idToken: string;

  constructor(data?: Partial<ExternalLoginDto>) {
    super(data);
  }
}
