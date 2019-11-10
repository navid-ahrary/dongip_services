import {Credentials} from '../repositories';
import {HttpErrors} from '@loopback/rest';
import PhoneNumber from 'awesome-phonenumber';

export function validateCredentials(credentials: Credentials) {
  // Validate phone number
  const pn = new PhoneNumber(credentials.phone);
  if (!pn.isMobile()) {
    throw new HttpErrors.UnprocessableEntity('Invalid phone value.');
  }

  if (credentials.password.length !== 4 || typeof credentials.password !== 'string') {
    // Validate Password Length
    throw new HttpErrors.UnprocessableEntity(
      'Password must be exact 4 string characters',
    );
  }
}
