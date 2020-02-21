import { BindingKey } from '@loopback/context'
import { TokenService, UserService } from '@loopback/authentication'
require( "dotenv" ).config()

import { Users, Credentials } from './models'
import { PasswordHasher } from './services'

export namespace TokenServiceConstants {
  export const TOKEN_SECRET_VALUE = process.env.TOKEN_SECRET_VALUE
  export const START_TOKEN_SECRET_VALUE = process.env.START_TOKEN_SECRET_VALUE
  export const VERIFY_TOKEN_EXPIRES_IN_VALUE =
    process.env.VERIFY_TOKEN_EXPIRES_IN_VALUE
  export const ACCESS_TOKEN_EXPIRES_IN_VALUE =
    process.env.ACCESS_TOKEN_EXPIRES_IN_VALUE
  export const REFRESH_TOKEN_EXPIRES_IN_VALUE =
    process.env.REFRESH_TOKEN_EXPIRES_IN_VALUE
}


export namespace TokenServiceBindings {
  export const TOKEN_SECRET = BindingKey.create<string>(
    'authentication.jwt.secret'
  )
  export const START_TOKEN_SECRET = BindingKey.create<string>(
    'authentication.jwt.secret'
  )
  export const VERIFY_TOKEN_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.verify.expires.in.seconds',
  )
  export const ACCESS_TOKEN_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.access.expires.in.seconds',
  )
  export const REFRESH_TOKEN_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.refresh.expires.in.seconds',
  )
  export const TOKEN_SERVICE = BindingKey.create<TokenService>(
    'services.authentication.jwt.tokenservice',
  )
}


export namespace PasswordHasherBindings {
  export const PASSWORD_HASHER = BindingKey.create<PasswordHasher>(
    'services.hasher'
  )
  export const ROUNDS = BindingKey.create<number>( 'services.hasher.round' )
}


export namespace UserServiceBindings {
  export const USER_SERVICE = BindingKey.create<UserService<Users, Credentials>>(
    'services.user.service',
  )
}
