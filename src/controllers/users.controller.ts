/* eslint-disable prefer-const */
/* eslint-disable require-atomic-updates */
import { inject } from '@loopback/core'
import { repository } from '@loopback/repository'
import { post, getModelSchemaRef, requestBody, HttpErrors, get, param, patch } from '@loopback/rest'

import { Users, Credentials } from '../models'
import { UsersRepository, BlacklistRepository } from '../repositories'
import { authenticate, UserService, TokenService } from '@loopback/authentication'
import { SecurityBindings, securityId, UserProfile } from '@loopback/security'
import { PasswordHasherBindings, UserServiceBindings, TokenServiceBindings } from '../keys'
import { PasswordHasher } from '../services/hash.password.bcryptjs'
import { validatePhoneNumber, validatePassword } from '../services/validator'
import { CredentialsRequestBody, UserProfileSchema } from './specs/user-controller.specs'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'
import underscore from 'underscore'
import moment from 'moment'

export class UsersController
{
  constructor (
    @repository( UsersRepository ) public usersRepository: UsersRepository,
    @repository( BlacklistRepository ) public blacklistRepository: BlacklistRepository,
    @inject( PasswordHasherBindings.PASSWORD_HASHER ) public passwordHasher: PasswordHasher,
    @inject( UserServiceBindings.USER_SERVICE ) public userService: UserService<Users, Credentials>,
    @inject( TokenServiceBindings.TOKEN_SERVICE ) public jwtService: TokenService,
  ) { }

  arrayHasObject ( arr: object[], obj: object ): boolean
  {
    for ( const ele of arr )
    {
      if ( underscore.isEqual( ele, obj ) )
      {
        return true
      }
    }
    return false
  }

  arrayRemoveItem ( arr: object[], obj: object )
  {
    arr.forEach( function ( ele )
    {
      if ( underscore.isEqual( ele, obj ) )
      {
        arr.splice( arr.indexOf( ele ) )
      }
    } )
    return arr
  }

  @get( '/apis/users/{phone}/check', {
    responses: {
      '200': {
        description: 'Check this phone number has been registerd or must register now',
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
  async checkPhoneNumber (
    @param.path.string( 'phone' ) phone: string,
  ): Promise<object>
  {
    try
    {
      let isRegistered = false
      // Ensure a valid phone number
      validatePhoneNumber( phone )

      const user = await this.usersRepository.findOne( {
        where: { phone: phone },
        fields: {
          name: true,
          avatar: true,
          _rev: true,
          _key: true
        },
      } )
      if ( user )
      {
        isRegistered = true
      }
      return { isRegistered, ...user }
    } catch ( err )
    {
      console.log( err.message )
      throw new HttpErrors.MethodNotAllowed( err )
    }
  }

  @post( '/apis/users/{phone}/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: getModelSchemaRef( Users ),
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
  ): Promise<{ _key: typeof Users.prototype._key; accessToken: string }>
  {
    try
    {
      // ensure a valid phone and password value
      validatePhoneNumber( phone )
      validatePhoneNumber( user.phone )
      validatePassword( user.password )

      if ( phone !== user.phone )
      {
        throw new Error(
          'Error signup, Phone numbers in params and body not matched !',
        )
      }

      // encrypt the password
      user.password = await this.passwordHasher.hashPassword( user.password )
      user.registeredAt = moment().format()
      // create a new user
      const savedUser = await this.usersRepository.create( user )
      delete user.password

      //convert a User object into a UserProfile object (reduced set of properties)
      const userProfile = this.userService.convertToUserProfile( savedUser )

      //create a JWT token based on the user profile
      const accessToken = await this.jwtService.generateToken( userProfile )

      return { _key: savedUser._key, accessToken }
    } catch ( err )
    {
      console.log( err )
      if ( err.code === 409 )
      {
        throw new HttpErrors.Conflict( `This phone number is already taken.` )
      } else
      {
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
    @requestBody( CredentialsRequestBody ) credentials: Credentials,
  )
    : Promise<{ _key: typeof Users.prototype._key, accessToken: string }
    >
  {
    try
    {
      let user: Users,
        userProfile: UserProfile,
        accessToken: string

      if ( phone !== credentials.phone )
      {
        throw new Error(
          'Error login, Phone numbers in params and body not matched !',
        )
      }

      //ensure the user exists and the password is correct
      user = await this.userService.verifyCredentials( credentials )

      //convert a User object into a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile( user )
      //create a JWT token bas1ed on the Userprofile
      accessToken = await this.jwtService.generateToken( userProfile )

      await this.usersRepository.updateById( user._key, {
        registerationToken: credentials.registerationToken
      } )

      return { _key: user._key, accessToken }
    } catch ( err )
    {
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
  )
  {
    try
    {
      if ( _key !== currentUserProfile[ securityId ] )
      {
        throw new Error(
          'Error users logout ,Token is not matched to this user _key!',
        )
      }
      return await this.blacklistRepository.create(
        { _key: authorizationHeader.split( ' ' )[ 1 ] }
      )

    } catch ( err )
    {
      console.log( err )
      if ( err.code === 409 )
      {
        throw new HttpErrors.Conflict( `Error logout conflict token, this token is blacklisted already` )
      } else
      {
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
  ): Promise<{ _key: string; name: string, accessToken: string }>
  {
    if ( _key !== currentUserProfile[ securityId ] )
    {
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

  @get( '/apis/users/{_key}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef( Users ),
          },
        },
      },
    },
  } )
  @authenticate( 'jwt' )
  async findById (
    @param.path.string( '_key' ) _key: string,
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
  ): Promise<Users>
  {
    if ( _key !== currentUserProfile[ securityId ] )
    {
      throw new HttpErrors.Unauthorized(
        'Error users findById ,Token is not matched to this user _key!',
      )
    }
    return this.usersRepository.findById( _key )
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
              "locale",
              "geolocation",
              "password",
              "phone",
              "registerationToken" ],
          } ),
        },
      },
    } )
    user: Omit<Users, '_key'>,
  ): Promise<Users>
  {
    if ( _key !== currentUserProfile[ securityId ] )
    {
      throw new HttpErrors.Unauthorized( 'Token is not matched to this user _key!' )
    }
    await this.usersRepository.updateById( _key, user )
    return this.usersRepository.findById( _key, {
      fields: { _rev: true }
    } )
  }
}
