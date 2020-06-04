import {Credentials} from '../models';

export function validatePassword(password: Credentials['password']) {
  const invalidPassword = 'Password must be exact 9 string characters';

  // Validate Password Length
  if (password.length !== 9 || typeof password !== 'string') {
    throw new Error(invalidPassword);
  }
  return;
}
