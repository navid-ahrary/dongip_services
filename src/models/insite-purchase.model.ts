import {model, property, Model} from '@loopback/repository';

@model()
export class InsitePurchase extends Model {
  @property({type: 'string', required: true}) userPhoneOrEmail: string;

  @property({type: 'string', required: true}) itemPrice: string;

  @property({type: 'number', required: true}) wcOrderKey: number;
}
