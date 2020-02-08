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
  UsersRepository, BlacklistRepository, PoemRepository, VerifyRepository
} from '../repositories'
import {
  authenticate, UserService, TokenService
} from '@loopback/authentication'
import { SecurityBindings, securityId, UserProfile } from '@loopback/security'
import {
  PasswordHasherBindings, UserServiceBindings, TokenServiceBindings
} from '../keys'
import { PasswordHasher } from '../services/hash.password.bcryptjs'
import { validatePhoneNumber, validatePassword } from '../services/validator'
import {
  CredentialsRequestBody, UserProfileSchema
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
    @repository( VerifyRepository ) public verifyRepository: VerifyRepository,
    @repository( PoemRepository ) public poemsRepository: PoemRepository,
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
      verifyEntity = { _key: '', createdAt: '', password: '' },
      hashedVerifyCodeObj: { password: string, salt: string },
      payload: admin.messaging.MessagingPayload

    try {
      validatePhoneNumber( phone )
    } catch ( _err ) {
      console.log( _err )
      throw new HttpErrors.NotAcceptable( _err.message )
    }

    verifyCode = Math.floor( Math.random() * 1000000 ).toString()
    hashedVerifyCodeObj = await this.passwordHasher
      .hashPassword( verifyCode )

    verifyEntity[ '_key' ] = phone
    verifyEntity[ 'createdAt' ] = moment().format()
    verifyEntity[ 'password' ] = ( await this.passwordHasher
      .hashPassword( hashedVerifyCodeObj.password ) ).password

    await this.verifyRepository.create( verifyEntity )
      .then( async _result => {
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
        if ( user ) isRegistered = true

        // this.smsApi.VerifyLookup( {
        //   token: verifyCode,
        //   template: 'dongip',
        //   type: 'sms',
        //   receptor: phone.replace( '+98', '0' )
        // },
        //   function ( response: any, status: any ) {
        //     console.log( response )
        //     verifyLook = status
        //   } )

        payload = { data: { salt: hashedVerifyCodeObj.salt } }
        await admin
          .messaging()
          .sendToDevice( registerationToken, payload )
          .then( function ( _res: any ) {
            console.log( _res )
          } )
          .catch( function ( _err: any ) {
            console.log( _err )
          } )
      } )
      .catch( async _error => {
        await this.verifyRepository.findById( phone )
          .then( _result => {
            const createdAt = _result.createdAt
            const now = moment().format()
            const countTime = this.TimeDiff( createdAt, now, 'second' )
            const remainedTime = Number( process.env.DB_TTL ) - countTime
            throw new HttpErrors.MethodNotAllowed( `Wait about ${ remainedTime } seconds` )
          } )
      } )
    return {
      ...user!,
      isRegistered,
      salt: hashedVerifyCodeObj.salt,
      code: verifyCode
    }
  }


  @post( '/apis/users/{phone}/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: getModelSchemaRef( Users, {
              exclude: [ 'osSpec', 'password', 'accountType' ]
            } ),
          },
        },
      },
    },
  } )
  @authenticate.skip()
  async create (
    @param.path.string( 'phone' ) phone: string,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( Users, {
            title: 'NewUser',
          } ),
        },
      },
    } )
    user: Users,
  ): Promise<{
    _key: typeof Users.prototype._key
    _id: typeof Users.prototype._id
    _rev: typeof Users.prototype._rev
    accessToken: string
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
      validatePassword( user.password )

      // encrypt the password
      user.password = ( await ( this.passwordHasher.hashPassword( user.password ) ) ).password
      user.registeredAt = moment().format()
      // Create a new user
      const savedUser = await this.usersRepository.createHumanKind( user )
      delete user.password

      // Convert a User object into a UserProfile object
      const userProfile = this.userService.convertToUserProfile( savedUser )

      // Create a JWT token based on the user profile
      const accessToken = await this.jwtService.generateToken( userProfile )

      // Create self-relation for self accounting
      const usersRels = await this.usersRepository.createHumanKindUsersRels(
        savedUser._key,
        {
          _from: savedUser._id,
          _to: savedUser._id,
          alias: savedUser.name,
          avatar: savedUser.avatar,
          type: 'self'
        } )

      return {
        _key: savedUser._key,
        _id: savedUser._id,
        _rev: savedUser._rev,
        accessToken,
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
              type: 'object', properties: {
                _key: 'string',
                accessToken: 'string',
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
    : Promise<{ _key: typeof Users.prototype._key, accessToken: string }
    > {
    try {
      let user: Users,
        userProfile: UserProfile,
        accessToken: string

      if ( phone !== credentials.phone ) {
        throw new Error(
          'Error login, Phone numbers in params and body not matched !',
        )
      }

      //ensure the user exists and the password is correct
      user = await this.userService.verifyCredentials( credentials )

      //convert a User object into a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile( user )
      userProfile[ 'aud' ] = userAgent
      userProfile[ 'accountType' ] = 'pro'
      //create a JWT token bas1ed on the Userprofile
      accessToken = await this.jwtService.generateToken( userProfile )

      await this.usersRepository.updateById( user._key, {
        registerationToken: credentials.registerationToken
      } )

      return { _key: user._key, accessToken }
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
        throw new HttpErrors.Conflict( `Error logout conflict token, this token is blacklisted already` )
      } else {
        throw new HttpErrors.MethodNotAllowed( `Error logout not implemented: ${ err.message }` )
      }
    }
  }


  @get( '/apis/users/{_key}/me', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'The current user profile',
        content: {
          'application/json': {
            schema: UserProfileSchema,
          },
        },
      },
    },
  } )
  @authenticate( 'jwt' )
  async printCurrentUser (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: typeof Users.prototype._key,
  ): Promise<{ _key: string; name: string, accessToken: string }> {
    if ( _key !== currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Error users print current user , Token is not matched to this user _key!',
      )
    }

    const user = await this.usersRepository.findById( currentUserProfile[ securityId ] )
    delete user.password

    const userProfile = this.userService.convertToUserProfile( user )
    const accessToken = await this.jwtService.generateToken( userProfile )

    return { _key: user._key, name: user.name, accessToken: accessToken }
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
              "_id",
              "_key",
              "_rev",
              "accountType",
              "registeredAt",
              "dongsId",
              "usersRels",
              "categories",
              "geolocation",
              "password",
              "phone",
              "registerationToken",
              "osSpec" ],
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
