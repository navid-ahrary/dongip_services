import {Credentials} from '../models';
import PhoneNumber from 'awesome-phonenumber';

import Debug from 'debug';
const debug = Debug('dongip');

export function validatePhoneNumber (phoneNumber: Credentials['phone']) {
  const invalidPhone = 'Invalid phone value !';
  try {
    // Validate phone number
    const pn = new PhoneNumber(phoneNumber);
    if (!pn.isMobile()) {
      debug(invalidPhone);
      throw new Error(invalidPhone);
    }
    return;
  } catch (_err) {
    debug(_err);
    throw new Error(_err);
  }
}


export function validatePassword (password: Credentials['password']) {
  const invalidPassword = 'Password must be exact 9 string characters';

  // Validate Password Length
  if (password.length !== 9 || typeof password !== 'string') {
    debug(invalidPassword);
    throw new Error(invalidPassword);
  }
  return;
}
