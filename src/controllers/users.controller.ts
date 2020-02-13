/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable require-atomic-updates */
import { inject } from '@loopback/core'
import { repository } from '@loopback/repository'
import {
  post,
  requestBody,
  HttpErrors,
  get,
  param,
  patch
} from '@loopback/rest'
import {
  Users,
  Credentials
} from '../models'
import {
  UsersRepository,
  BlacklistRepository
} from '../repositories'
import {
  authenticate,
  UserService,
  TokenService
} from '@loopback/authentication'
import {
  SecurityBindings,
  securityId,
  UserProfile
} from '@loopback/security'
import {
  PasswordHasherBindings,
  UserServiceBindings,
  TokenServiceBindings
} from '../keys'
import { PasswordHasher } from '../services/hash.password.bcryptjs'
import { validatePhoneNumber } from '../services/validator'
import {
  CredentialsRequestBody,
  UserLoginResponse,
  UserVerifyResponse,
  UserSignupRequestBody,
  UserPatchRequestBody,
  UserSignupResponse,
} from './specs/user-controller.specs'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'
import _ from 'underscore'
import moment from 'moment'
import admin from 'firebase-admin'
require( 'dotenv' ).config()
const Kavenegar = require( 'kavenegar' )

export class UsersController {
  constructor (
    @repository( UsersRepository ) public usersRepository: UsersRepository,
    @repository( BlacklistRepository )
    public blacklistRepository: BlacklistRepository,
    @inject( PasswordHasherBindings.PASSWORD_HASHER )
    public passwordHasher: PasswordHasher,
    @inject( UserServiceBindings.USER_SERVICE )
    public userService: UserService<Users, Credentials>,
    @inject( TokenServiceBindings.TOKEN_SERVICE ) public jwtService: TokenService,
  ) { }
  smsApi = Kavenegar.KavenegarApi( {
    apikey: process.env.KAVENEGAR_API
  } )


  TimeDiff = ( startTime: any, endTime: any, format: any ) => {
    startTime = moment( startTime, 'YYYY-MM-DD HH:mm:ss' )
    endTime = moment( endTime, 'YYYY-MM-DD HH:mm:ss' )
    return endTime.diff( startTime, format )
  }


  arrayHasObject ( arr: object[], obj: object ): boolean {
    for ( const ele of arr ) {
      if ( _.isEqual( ele, obj ) ) {
        return true
      }
    }
    return false
  }


  arrayRemoveItem ( arr: object[], obj: object ) {
    arr.forEach( function ( ele ) {
      if ( _.isEqual( ele, obj ) ) {
        arr.splice( arr.indexOf( ele ) )
      }
    } )
    return arr
  }


  generateRandomString ( length: number ) {
    let result = '',
      characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      charactersLength = characters.length
    for ( let i = 0; i < length; i++ ) {
      result += characters.charAt( Math.floor( Math.random() * charactersLength ) )
    }
    return result
  }


  @get( '/apis/users/{phone}/verify', {
    responses: UserVerifyResponse
  } )
  @authenticate.skip()
  async verify (
    @param.header.string( 'User-Agent' ) userAgent: string,
    @param.header.string( 'Registeration-Token' ) registerationToken: string,
    @param.path.string( 'phone' ) phone: string, ): Promise<{
      status: boolean,
      name: string | undefined,
      avatar: string | undefined,
      prefix: string,
      'verifyToken(temp - will send by notification)': string,
      'code(temp - will send by sms)': string,
    }> {

    let status = false,
      user: Users | null,
      verifyCode = Math.random().toFixed( 5 ).slice( 3 ),
      randomStr = this.generateRandomString( 3 ),
      payload: admin.messaging.MessagingPayload,
      verifyToken: string,
      userProfile: UserProfile = { [ securityId ]: '' }

    try {
      validatePhoneNumber( phone )
    } catch ( _err ) {
      console.log( _err )
      throw new HttpErrors.NotAcceptable( _err.message )
    }

    userProfile = {
      [ securityId ]: phone,
      password: randomStr + verifyCode,
      registerationToken: registerationToken,
      type: 'verify',
      expiresIn: 90,
      agent: userAgent
    }

    // Generate verify token based on user profile
    verifyToken = await this.jwtService.generateToken( userProfile )

    user = await this.usersRepository.findOne( {
      where: { phone: phone },
      fields: {
        name: true,
        avatar: true
      },
    } )
    if ( user ) {
      status = true
    }

    // send verify code with sms
    // this.smsApi.VerifyLookup( {
    //   token: verifyCode,
    //   template: 'dongip',
    //   type: 'sms',
    //   receptor: phone.replace( '+98', '0' )
    // },
    //   function ( _response: any, _status: any ) {
    //     console.log( _response, _status )
    //   } )

    try {
      // send verify token by notification
      payload = {
        data: {
          verifyToken: verifyToken
        }
      }
      admin.messaging()
        .sendToDevice( registerationToken, payload )
        .then( function ( _res: any ) {
          console.log( _res )
        } )
        .catch( function ( _err: any ) {
          console.log( _err )
        } )
    } catch ( err ) {
      console.log( err.message )
      throw new HttpErrors.UnprocessableEntity( err.message )
    }

    return {
      ...user!,
      status: status,
      prefix: randomStr,
      'verifyToken(temp - will send by notification)': verifyToken,
      'code(temp - will send by sms)': verifyCode,
    }
  }


  @post( '/apis/users/{phone}/login', {
    security: OPERATION_SECURITY_SPEC,
    responses: UserLoginResponse,
  } )
  @authenticate( 'jwt' )
  async login (
    @param.path.string( 'phone' ) phone: string,
    @param.header.string( 'Authorization' ) token: string,
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @requestBody( CredentialsRequestBody ) credentials: Credentials,
  ): Promise<{
    _key: string,
    _id: string,
    accessToken: string,
    refreshToken: string
  }> {

    let userProfile: UserProfile,
      user: Users,
      accessToken: string

    // add token to blacklist
    await this.blacklistRepository.createHumanKind( {
      token: token.split( ' ' )[ 1 ]
    } )

    if ( phone !== credentials.phone ) {
      console.log( 'Error login, Phone numbers are not matched !' )
      throw new HttpErrors.NotAcceptable(
        'Error login, Phone numbers are not matched !',
      )
    }
    if ( phone !== currentUserProfile.sub ) {
      console.log( 'This token in not yours !' )
      throw new HttpErrors.Unauthorized( 'This token in not yours !' )
    }
    if ( credentials.password !== currentUserProfile.password ) {
      console.log( 'Login failed, incorrect password !' )
      throw new HttpErrors.Unauthorized( 'Login failed, incorrect password !' )
    }

    try {
      //ensure the user exists and the password is correct
      user = await this.userService.verifyCredentials( credentials )
    } catch ( err ) {
      console.log( err )
      throw new HttpErrors.Unauthorized( err.message )
    }

    //convert a User object into a UserProfile object (reduced set of properties)
    userProfile = this.userService.convertToUserProfile( user )
    userProfile[ 'aud' ] = currentUserProfile.agent
    userProfile[ 'type' ] = 'access'

    try {
      //create a JWT token based on the Userprofile
      accessToken = await this.jwtService.generateToken( userProfile )
    } catch ( err ) {
      console.log( err )
      throw new HttpErrors.NotImplemented( err )
    }

    return {
      _key: user._key,
      _id: user._id,
      accessToken: accessToken,
      refreshToken: user.refreshToken,
    }
  }


  @post( '/apis/users/{phone}/signup', {
    security: OPERATION_SECURITY_SPEC,
    responses: UserSignupResponse
  } )
  @authenticate( 'jwt' )
  async signup (
    @param.path.string( 'phone' ) phone: string,
    @param.header.string( 'Authorization' ) token: string,
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @requestBody( UserSignupRequestBody ) user: Users ): Promise<{
      _key: string
      _id: string
      accessToken: string
      refreshToken: string
    }> {
    let savedUser: Users,
      accessToken: string,
      userProfile: UserProfile = { [ securityId ]: '' }
    try {
      // add verify token to blacklist
      await this.blacklistRepository.createHumanKind( {
        token: token.split( ' ' )[ 1 ]
      } )

      if ( phone !== user.phone ) {
        console.log( 'Error login, Phone numbers are not matched !' )
        throw new HttpErrors.NotAcceptable(
          'Error login, Phone numbers are not matched !',
        )
      }
      if ( phone !== currentUserProfile.sub ) {
        console.log( 'This token in not yours !' )
        throw new HttpErrors.Unauthorized( 'This token in not yours !' )
      }
      if ( user.password !== currentUserProfile.password ) {
        console.log( 'Login failed, incorrect password !' )
        throw new HttpErrors.Unauthorized( 'Login failed, incorrect password !' )
      }

      // ensure a valid phone and password value
      validatePhoneNumber( user.phone )

      user[ 'registeredAt' ] = moment().format()
      delete user[ 'password' ]
      // Create a new user
      savedUser = await this.usersRepository.createHumanKind( user )

      //convert a User object into a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile( savedUser )
      userProfile[ 'aud' ] = currentUserProfile.agent
      userProfile[ 'type' ] = 'access'

      //create a JWT token based on the Userprofile
      accessToken = await this.jwtService.generateToken( userProfile )

      // Create self-relation for self accounting
      await this.usersRepository.createHumanKindUsersRels(
        savedUser._key,
        {
          _from: savedUser._id,
          _to: savedUser._id,
          alias: savedUser.name,
          avatar: savedUser.avatar,
          type: 'self',
        } )

      return {
        _key: savedUser._key,
        _id: savedUser._id,
        accessToken: accessToken,
        refreshToken: user.refreshToken
      }
    } catch ( err ) {
      console.log( err )
      if ( err.code === 409 ) {
        throw new HttpErrors.Conflict( 'This phone number is already taken.' )
      } else {
        throw new HttpErrors.NotAcceptable( err.message )
      }
    }
  }


  @get( '/apis/users/{_key}/logout', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: "Logout current user's client",
      },
    },
  } )
  @authenticate( 'jwt' )
  async logout (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.header.string( 'authorization' ) authorizationHeader: string,
    @param.path.string( '_key' ) _key: string,
  ) {
    try {
      if ( _key !== currentUserProfile[ securityId ] ) {
        throw new Error(
          'Error users logout ,Token is not matched to this user _key!',
        )
      }
      return await this.blacklistRepository.createHumanKind(
        { token: authorizationHeader.split( ' ' )[ 1 ] }
      )

    } catch ( err ) {
      console.log( err )
      if ( err.code === 409 ) {
        throw new HttpErrors.Conflict
          ( `Error logout conflict token, this token is blacklisted already` )
      } else {
        throw new HttpErrors.MethodNotAllowed
          ( `Error logout not implemented: ${ err.message }` )
      }
    }
  }


  @patch( '/apis/users/{_key}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  } )
  @authenticate( 'jwt' )
  async updateById (
    @param.path.string( '_key' ) _key: string,
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @requestBody( UserPatchRequestBody )
    user: Omit<Users, '_key'> ): Promise<Users> {
    if ( _key !== currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized( 'Token is not matched to this user _key!' )
    }
    await this.usersRepository.updateById( _key, user )
    return this.usersRepository.findById( _key, {
      fields: { _rev: true }
    } )
  }
}
