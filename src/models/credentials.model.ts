import {Model, model, property} from '@loopback/repository';

@model()
export class Credentials extends Model {
  @property({type: 'string', required: true, length: 13}) phone: string;
  @property({type: 'string', required: true, length: 9}) password: string;

  constructor(data?: Partial<Credentials>) {
    super(data);
  }
}

export interface CredentialsRelations {}

export type CredentialsWithRelations = Credentials & CredentialsRelations;
