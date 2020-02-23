/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable require-atomic-updates */
import { inject, service } from '@loopback/core'
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
  authenticate,
  UserService,
  TokenService
} from '@loopback/authentication'
import { SecurityBindings, securityId, UserProfile } from '@loopback/security'

import {
  PasswordHasherBindings,
  UserServiceBindings,
  TokenServiceBindings
} from '../keys'
import {
  CredentialsRequestBody,
  UserLoginResponse,
  UserVerifyResponse,
  UserSignupRequestBody,
  UserPatchRequestBody,
  UserSignupResponse,
} from './specs/user-controller.specs'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'
import { Users, Credentials, Blacklist } from '../models'
import { UsersRepository, BlacklistRepository } from '../repositories'
import {
  FirebaseService,
  SmsService,
  validatePhoneNumber,
  PasswordHasher,
  TimeService
} from '../services'


export class UsersController {
  constructor (
    @repository( UsersRepository ) public usersRepository: UsersRepository,
    @repository( BlacklistRepository )
    public blacklistRepository: BlacklistRepository,
    @inject( PasswordHasherBindings.PASSWORD_HASHER )
    public passwordHasher: PasswordHasher,
    @inject( UserServiceBindings.USER_SERVICE )
    public userService: UserService<Users, Credentials>,
    @inject( TokenServiceBindings.TOKEN_SERVICE )
    public jwtService: TokenService,
    @service( FirebaseService ) public firebaseService: FirebaseService,
    @service( SmsService ) public smsService: SmsService,
    @service( TimeService ) public timeService: TimeService
  ) { }

  private generateRandomString ( length: number ) {
    let result = '',
      characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      charactersLength = characters.length
    for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(
        Math.floor( Math.random() * charactersLength )
      )
    }
    return result
  }


  private checkUserKey ( userKey: string, currentUserProfile: UserProfile ) {
    if ( userKey !== currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      )
    }
  }


  @get( '/apis/users/{phone}/verify', {
    responses: UserVerifyResponse
  } )
  @authenticate.skip()
  async verify (
    @param.header.string( 'User-Agent' ) userAgent: string,
    @param.header.string( 'Registeration-Token' ) regToken: string,
    @param.path.string( 'phone' ) phone: string,
  ): Promise<{
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
      payload,
      verifyToken: string,
      userProfile: UserProfile

    try {
      validatePhoneNumber( phone )
    } catch ( _err ) {
      console.log( _err )
      throw new HttpErrors.NotAcceptable( _err.message )
    }

    userProfile = {
      [ securityId ]: phone,
      password: randomStr + verifyCode,
      regToken: regToken,
      type: 'verify',
      agent: userAgent
    }

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
    // Generate verify token based on user profile
    verifyToken = await this.jwtService.generateToken( userProfile )

    // send verify code with sms
    this.smsService.sendSms( 'dongip', verifyCode, phone )

    try {
      // send verify token by notification
      payload = {
        data: {
          verifyToken: verifyToken
        }
      }
      this.firebaseService.sendToDeviceMessage( regToken, payload )

    } catch ( _err ) {
      console.log( _err )
      throw new HttpErrors.UnprocessableEntity( _err.message )
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
  @authenticate( 'jwt.verify' )
  async login (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( 'phone' ) phone: string,
    @param.header.string( 'Authorization' ) token: string,
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

    if ( phone !== credentials.phone ) {
      console.log( 'Error login, Phone numbers are not matched !' )
      throw new HttpErrors.NotAcceptable(
        'Error login, Phone numbers are not matched !',
      )
    }
    if ( phone !== currentUserProfile[ securityId ] ) {
      console.log( 'This token in not yours !' )
      throw new HttpErrors.Unauthorized( 'This token in not yours !' )
    }
    if ( credentials.password !== currentUserProfile.password ) {
      console.log( 'Login failed, incorrect password !' )
      throw new HttpErrors.Unauthorized( 'Login failed, incorrect password !' )
    }

    try {
      validatePhoneNumber( phone )
    } catch ( _err ) {
      console.log( _err )
      throw new HttpErrors.UnprocessableEntity( _err.message )
    }

    // add token to blacklist
    await this.blacklistRepository.createHumanKind( {
      token: token.split( ' ' )[ 1 ]
    } )

    try {
      //ensure the user exists and the password is correct
      user = await this.userService.verifyCredentials( credentials )

      await this.usersRepository.updateById( user._key, {
        userAgent: currentUserProfile.agent,
        registerationToken: currentUserProfile.regToken
      } )
    } catch ( _err ) {
      console.log( _err )
      throw new HttpErrors.Unauthorized( _err.message )
    }

    //convert a User object to a UserProfile object (reduced set of properties)
    userProfile = this.userService.convertToUserProfile( user )
    userProfile[ 'type' ] = 'access'

    try {
      //create a JWT token based on the Userprofile
      accessToken = await this.jwtService.generateToken( userProfile )
    } catch ( _err ) {
      console.log( _err )
      throw new HttpErrors.NotImplemented( _err.message )
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
  @authenticate( 'jwt.verify' )
  async signup (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( 'phone' ) phone: string,
    @param.header.string( 'Authorization' ) token: string,
    @requestBody( UserSignupRequestBody ) user: Users
  ): Promise<{
    _key: string
    _id: string
    accessToken: string
    refreshToken: string
  }> {
    let savedUser: Users,
      accessToken: string,
      userProfile: UserProfile

    try {
      if ( phone !== user.phone ) {
        console.log( 'Error login, Phone numbers are not matched !' )
        throw new HttpErrors.NotAcceptable(
          'Error login, Phone numbers are not matched !',
        )
      }
      if ( phone !== currentUserProfile[ securityId ] ) {
        console.log( 'This token in not yours !' )
        throw new HttpErrors.Unauthorized( 'This token in not yours !' )
      }
      if ( user.password !== currentUserProfile.password ) {
        console.log( 'Login failed, incorrect password !' )
        throw new HttpErrors.Unauthorized(
          'Login failed, incorrect password !' )
      }

      // ensure a valid phone and password value
      validatePhoneNumber( user.phone )

      // add verify token to blacklist
      await this.blacklistRepository.createHumanKind( {
        token: token.split( ' ' )[ 1 ]
      } )

      user[ 'registeredAt' ] = this.timeService.now()
      user[ 'registerationToken' ] = currentUserProfile.regToken
      user[ 'userAgent' ] = currentUserProfile.agent
      delete user[ 'password' ]
      // Create a new user
      savedUser = await this.usersRepository.createHumanKind( user )

      //convert user object to a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile( savedUser )
      userProfile[ 'type' ] = 'access'

      //create a JWT token based on the Userprofile
      accessToken = await this.jwtService.generateToken( userProfile )

      // Create self-relation for self accounting
      await this.usersRepository.createHumanKindUsersRels( savedUser._id,
        {
          _to: savedUser._id,
          alias: savedUser.name,
          avatar: savedUser.avatar,
          type: 'self',
        } )

      return {
        _key: savedUser._key,
        _id: savedUser._id,
        accessToken: accessToken,
        refreshToken: savedUser.refreshToken
      }
    } catch ( _err ) {
      console.log( _err )
      if ( _err.code === 409 ) {
        throw new HttpErrors.Conflict( _err.response.body.errorMessage )
      } else {
        throw new HttpErrors.NotAcceptable( _err )
      }
    }
  }


  @get( '/apis/users/{_userKey}/logout', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: "Logout current user's client",
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async logout (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.header.string( 'authorization' ) authorizationHeader: string,
    @param.path.string( '_userKey' ) _userKey: string,
  ): Promise<Blacklist> {
    this.checkUserKey( _userKey, currentUserProfile )

    return this.blacklistRepository.createHumanKind(
      {
        token: authorizationHeader.split( ' ' )[ 1 ],
        createdAt: this.timeService.now()
      }
    ).catch( _err => {
      console.log( _err )
      if ( _err.code === 409 ) {
        throw new HttpErrors.Conflict( _err.response.body.errorMessage )
      } else {
        throw new HttpErrors.MethodNotAllowed
          ( `Error logout not implemented: ${ _err.message }` )
      }
    } )
  }


  @patch( '/apis/users/{_userKey}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async updateById (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_userKey' ) _userKey: string,
    @requestBody( UserPatchRequestBody ) user: Omit<Users, '_key'>
  ): Promise<Users> {
    this.checkUserKey( _userKey, currentUserProfile )

    await this.usersRepository.updateById( _userKey, user )
    return this.usersRepository.findById( _userKey, {
      fields: { _rev: true }
    } )
  }


  @get( '/apis/users/{_userKey}/refresh-token', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'New access token'
      }
    }
  } )
  @authenticate( 'jwt.refresh' )
  async refreshToken (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.header.string( 'Authorization' ) token: string
  ) {
    let user: Users,
      userProfile: UserProfile,
      accessToken: string,
      isMatched: boolean

    user = await this.usersRepository.findById(
      currentUserProfile[ securityId ]
    )
    isMatched = await this.passwordHasher.comparePassword(
      token.split( ' ' )[ 1 ],
      user.refreshToken
    )

    if ( !isMatched ) {
      throw new HttpErrors.Unauthorized( 'Refresh tokens are not matched' )
    }

    userProfile = this.userService.convertToUserProfile( user )
    userProfile[ 'type' ] = 'access'

    accessToken = await this.jwtService.generateToken( userProfile )

    return { accessToken: accessToken }
  }
}
