import { Credentials } from '../models'
import PhoneNumber from 'awesome-phonenumber'


export function validatePhoneNumber ( phoneNumber: Credentials[ 'phone' ] )
{
  try
  {
    // Validate phone number
    const pn = new PhoneNumber( phoneNumber )
    if ( !pn.isMobile() )
    {
      throw new Error( 'Invalid phone value.' )
    }
    return
  } catch ( err )
  {
    throw new Error( err )
  }
}


export function validatePassword ( password: Credentials[ 'password' ] )
{
  // Validate Password Length
  if ( password.length !== 4 || typeof password !== 'string' )
  {
    throw new Error(
      'Password must be exact 4 string characters',
    )
  }
  return
}
