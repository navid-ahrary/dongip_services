/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable require-atomic-updates */
import { inject } from '@loopback/core'
import { repository } from '@loopback/repository'
import {
  post, getModelSchemaRef, requestBody, HttpErrors, get, param, patch
} from '@loopback/rest'
import { Users, Credentials, UsersRels } from '../models'
import {
  UsersRepository, BlacklistRepository
} from '../repositories'
import {
  authenticate, UserService, TokenService
} from '@loopback/authentication'
import { SecurityBindings, securityId, UserProfile } from '@loopback/security'
import {
  PasswordHasherBindings, UserServiceBindings, TokenServiceBindings
} from '../keys'
import { PasswordHasher } from '../services/hash.password.bcryptjs'
import { validatePhoneNumber } from '../services/validator'
import {
  CredentialsRequestBody
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
      characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!?'@#$%^&()<>{}[]_-*+|/",
      charactersLength = characters.length
    for ( let i = 0; i < length; i++ ) {
      result += characters.charAt( Math.floor( Math.random() * charactersLength ) )
    }
    return result
  }


  @get( '/apis/users/{phone}/verify', {
    responses: {
      '200': {
        description: 'Checking this phone number has been registerd and sending verify sms',
        content: {
          'application/json': {
            schema: {
              isRegistered: 'bool',
              _key: 'string',
              _rev: 'string',
              name: 'string',
              avatar: 'string',
            },
          },
        },
      },
    },
  } )
  @authenticate.skip()
  async verify (
    @param.header.string( 'User-Agent' ) userAgent: string,
    @param.path.string( 'phone' ) phone: string,
    @param.query.string( 'registerationToken' ) registerationToken: string,
  ): Promise<object> {

    let isRegistered = false,
      user: Users | null,
      verifyCode: string,
      payload: admin.messaging.MessagingPayload,
      accessToken: string,
      userProfile: UserProfile = { [ securityId ]: '' }

    try {
      validatePhoneNumber( phone )
    } catch ( _err ) {
      console.log( _err )
      throw new HttpErrors.NotAcceptable( _err.message )
    }

    verifyCode = Math.random().toFixed( 4 ).slice( 2 )

    userProfile = {
      [ securityId ]: phone,
      code: verifyCode,
      type: 'verifyToken',
      expiresIn: 120
    }
    accessToken = await this.jwtService.generateToken( userProfile )

    user = await this.usersRepository.findOne( {
      where: { phone: phone },
      fields: {
        name: true,
        avatar: true,
        _rev: true,
        _id: true,
        _key: true
      },
    } )
    if ( user ) {
      isRegistered = true
    }

    payload = {
      data: {
        accessToken: accessToken
      }
    }
    await admin
      .messaging()
      .sendToDevice( registerationToken, payload )
      .then( function ( _res: any ) {
        console.log( _res )
      } )
      .catch( function ( _err: any ) {
        console.log( _err )
      } )

    return {
      ...user!,
      isRegistered,
      accessToken: accessToken,
      code: verifyCode,
    }
  }


  @post( '/apis/users/{phone}/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: getModelSchemaRef( Users, {
              exclude: [ 'userAgent', 'accountType' ]
            } ),
          },
        },
      },
    },
  } )
  @authenticate.skip()
  async signup (
    @param.path.string( 'phone' ) phone: string,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( Users, {
            title: 'NewUser',
            exclude: [
              "_id", "_key", "_rev", "accountType", "categories", "categoryBills",
              "dongs", "dongsId", "geolocation", "userAgent", "phone", "refreshToken",
              "registerationToken", "registeredAt", "usersRels", "virtualUsers"
            ]
          } ),
        },
      },
    } )
    user: Users,
  ): Promise<{
    _key: typeof Users.prototype._key
    _id: typeof Users.prototype._id
    accessToken: string
    refreshToken: string
    usersRels: UsersRels
  }> {
    try {
      if ( phone !== user.phone ) {
        throw new Error(
          'Error signup, Phone numbers in params and body not matched !',
        )
      }
      // ensure a valid phone and password value
      validatePhoneNumber( user.phone )
      const verifyEntity = await this.userService.verifyCredentials( user )


      user[ 'registeredAt' ] = moment().format()
      // Create a new user
      const savedUser = await this.usersRepository.createHumanKind( user )

      // Convert a User object into a UserProfile object
      const userProfile = { [ securityId ]: savedUser._key }

      // Create a JWT token based on the user profile
      const refreshToken = await this.jwtService.generateToken( userProfile )
      await this.usersRepository.updateById( savedUser._key, {
        refreshToken: refreshToken
      } )

      // Create self-relation for self accounting
      const usersRels = await this.usersRepository.createHumanKindUsersRels(
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
        accessToken: refreshToken,
        refreshToken,
        usersRels
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


  @post( '/apis/users/{phone}/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/josn': {
            schema: {
              type: 'object',
              properties: {
                _key: 'string',
                accessToken: 'string',
                refreshToken: 'string',
              },
            },
          },
        },
      },
    },
  } )
  @authenticate.skip()
  async login (
    @param.path.string( 'phone' ) phone: string,
    @param.header.string( 'User-Agent' ) userAgent: string,
    @requestBody( CredentialsRequestBody ) credentials: Credentials,
  )
    : Promise<{
      accessToken: string,
      refreshToken: string
    }> {
    try {
      let userProfile: UserProfile = { [ securityId ]: '' },
        refreshToken: string

      if ( phone !== credentials.phone ) {
        throw new Error(
          'Error login, Phone numbers in params and body not matched !',
        )
      }

      //ensure the user exists and the password is correct
      const verifyEntity = await this.userService.verifyCredentials( credentials )

      //convert a User object into a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile( verifyEntity )
      userProfile[ 'aud' ] = userAgent
      userProfile[ 'accountType' ] = 'pro'
      userProfile[ 'typ' ] = 'accessToken'

      //create a JWT token based on the Userprofile
      refreshToken = await this.jwtService.generateToken( userProfile )

      // await this.usersRepository.updateById( verifyEntity.userKey!, {
      //   registerationToken: verifyEntity.registerationToken,
      //   userAgent: verifyEntity.userAgent
      // } )

      return {
        accessToken: refreshToken,
        refreshToken,
      }

    } catch ( err ) {
      console.log( err )
      throw new HttpErrors.MethodNotAllowed( err.message )
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
    @param.path.string( '_key' ) _key: typeof Users.prototype._key,
  ) {
    try {
      if ( _key !== currentUserProfile[ securityId ] ) {
        throw new Error(
          'Error users logout ,Token is not matched to this user _key!',
        )
      }
      return await this.blacklistRepository.createHumanKind(
        { _key: authorizationHeader.split( ' ' )[ 1 ] }
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
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( Users, {
            partial: true,
            exclude: [
              "_id", "_key", "_rev", "accountType", "registeredAt", "dongsId",
              "usersRels", "categories", "geolocation", "phone", "virtualUsers",
              "registerationToken", "refreshToken", "usersRels", "userAgent"
            ],
          } ),
        },
      },
    } )
    user: Omit<Users, '_key'>,
  ): Promise<Users> {
    if ( _key !== currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized( 'Token is not matched to this user _key!' )
    }
    await this.usersRepository.updateById( _key, user )
    return this.usersRepository.findById( _key, {
      fields: { _rev: true }
    } )
  }
}
