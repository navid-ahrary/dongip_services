import { Credentials } from '../models';
import { HttpErrors } from '@loopback/rest';
import PhoneNumber from 'awesome-phonenumber';

export function validatePhoneNumber(phoneNumber: Credentials['phone']) {
  try {
    // Validate phone number
    const pn = new PhoneNumber(phoneNumber);
    if (!pn.isMobile()) {
      throw new HttpErrors.NotAcceptable('Invalid phone value.');
    }
  } catch (err) {
    throw new HttpErrors.s(err);
  }
}
export function validatePassword(password: Credentials['password']) {
  if (password.length !== 4 || typeof password !== 'string') {
    // Validate Password Length
    throw new HttpErrors.NotAcceptable(
      'Password must be exact 4 string characters',
    );
  }
}
