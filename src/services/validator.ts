import {Credentials} from '../repositories';
import {HttpErrors} from '@loopback/rest';
import PhoneNumber from 'awesome-phonenumber';

export function validateCredentials(credentials: Credentials) {
  // Validate phone number
  const pn = new PhoneNumber(credentials.phone);

  if (!pn.isMobile) {
    throw new HttpErrors.UnprocessableEntity('invalid phone number.');
  }

  // Validate Password Length
  if (
    credentials.password.length !== 4 ||
    typeof credentials.password !== 'number'
  ) {
    throw new HttpErrors.UnprocessableEntity(
      'password must be exact 4 characters and should be number',
    );
  }
}
