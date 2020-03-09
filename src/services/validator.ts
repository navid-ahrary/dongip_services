import { Credentials } from '../models'
import PhoneNumber from 'awesome-phonenumber'


export function validatePhoneNumber (phoneNumber: Credentials[ 'phone' ]) {
  try {
    // Validate phone number
    const pn = new PhoneNumber(phoneNumber)
    if (!pn.isMobile()) {
      throw new Error('Invalid phone value.')
    }
    return
  } catch (err) {
    throw new Error(err)
  }
}


export function validatePassword (code: Credentials[ 'code' ]) {
  // Validate Password Length
  if (code.length !== 9 || typeof code !== 'string') {
    throw new Error(
      'Password must be exact 9 string characters',
    )
  }
  return
}
