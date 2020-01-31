/* eslint-disable prefer-const */
import { Count, CountSchema, Filter, repository, Where } from '@loopback/repository'
import
{
  get, getModelSchemaRef, getWhereSchemaFor, param, patch, post, requestBody, HttpErrors,
} from '@loopback/rest'
import { SecurityBindings, UserProfile, securityId } from '@loopback/security'
import { authenticate } from '@loopback/authentication'
import { inject } from '@loopback/core'
import * as admin from 'firebase-admin'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'
import { Users, UsersRels, FriendRequest, VirtualUsers } from '../models'
import
{
  UsersRepository, VirtualUsersRepository, BlacklistRepository, UsersRelsRepository
} from '../repositories'
import { validatePhoneNumber } from "../services/validator"

export class UsersUsersRelsController
{
  constructor (
    @repository( UsersRepository ) protected usersRepository: UsersRepository,
    @repository( VirtualUsersRepository ) public virtualUsersRepository: VirtualUsersRepository,
    @repository( BlacklistRepository ) public blacklistRepository: BlacklistRepository,
    @repository( UsersRelsRepository ) public usersRelsRepository: UsersRelsRepository,
  ) { }

  @get( '/apis/users/{_key}/users-rels', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Users has many UsersRels',
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef( UsersRels ) },
          },
        },
      },
    },
  } )
  @authenticate( 'jwt' )
  async find (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: string,
    @param.query.object( 'filter' ) filter?: Filter<UsersRels>,
  ): Promise<UsersRels[]>
  {
    if ( _key !== currentUserProfile[ securityId ] )
    {
      throw new HttpErrors.Unauthorized(
        'Error find category, Token is not matched to this user _key!',
      )
    }

    return this.usersRepository.usersRels( _key ).find( filter )
  }


  @post( '/apis/users/{_key}/users-rels/friend-request', {
    security: OPERATION_SECURITY_SPEC,
    responses: { '200': { description: 'Sending a friend request', }, },
  } )
  @authenticate( 'jwt' )
  async setFriend (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: typeof Users.prototype._key,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( FriendRequest, {
            exclude: [ "relationId", "status", "requesterId", "virtualUserId" ],
          } ),
        },
      },
    } )
    reqBody: FriendRequest,
  )
  {
    if ( _key !== currentUserProfile[ securityId ] )
    {
      throw new HttpErrors.Unauthorized(
        'Error users friend request ,Token is not matched to this user _key!',
      )
    }

    // validate recipient phone number
    validatePhoneNumber( reqBody.phone )

    let requesterUser: Users,
      recipientUser: Users | null,
      createdVirtualUser: VirtualUsers,
      createdUsersRelation: UsersRels,
      notificationResponse

    requesterUser = await this.usersRepository.findById( _key )
    recipientUser = await this.usersRepository.findOne( {
      where: { phone: reqBody.phone },
    } )

    if ( _key === recipientUser?._key )
    {
      throw new HttpErrors.NotAcceptable( 'You are the best friend of yourself! :)' )
    }

    const isRealFriend = await this.usersRepository.usersRels( _key ).find( {
      where: { and: [ { _from: requesterUser?._id }, { _to: recipientUser?._id } ] }
    } )
    if ( isRealFriend.length !== 0 )
    {
      throw new HttpErrors.NotAcceptable( 'You are real friends already!' )
    }

    try
    {
      const vu = { phone: reqBody.phone, usersId: _key }
      createdVirtualUser = await this.usersRepository.virtualUsers( _key ).create( vu )
      createdUsersRelation = await this.usersRepository.usersRels( _key ).create(
        {
          _from: requesterUser?._id, _to: createdVirtualUser._key[ 1 ],
          alias: reqBody.alias, type: 'virtual', avatar: reqBody.avatar,
          targetUsersId: recipientUser?._id
        }
      )
    } catch ( error )
    {
      console.log( error )
      if ( error.code === 409 )
      {
        throw new HttpErrors.Conflict( 'You are virtual friends already!' )
      } else
      {
        throw new HttpErrors.NotAcceptable( error )
      }
    }

    if ( requesterUser && recipientUser )
    {
      const payload: admin.messaging.MessagingPayload = {
        notification: {
          title: 'دنگیپ درخواست دوستی',
          body: `${ requesterUser.name } با شماره موبایل ${ requesterUser.phone } ازشما درخواست دوستی کرده`,
        },
        data: {
          requesterId: requesterUser._id,
          virtualUserId: createdVirtualUser._key[ 1 ],
          relationId: createdUsersRelation._key[ 1 ],
          name: requesterUser.name,
          phone: requesterUser.phone,
        },
      }
      const options: admin.messaging.MessagingOptions = {
        priority: 'normal',
        contentAvailable: true,
        mutableContent: false,
      }
      // send friend request notofication to recipient user client
      await admin
        .messaging()
        .sendToDevice( recipientUser.registerationToken, payload, options )
        .then( function ( _response )
        {
          console.log( _response )
          notificationResponse = _response
        } ).catch( function ( err )
        {
          console.log( err )
          notificationResponse = err
        } )
    }
    createdVirtualUser._key = createdVirtualUser._key[ 0 ]
    createdUsersRelation._key = createdUsersRelation._key[ 0 ]
    return { createdVirtualUser, createdUsersRelation, notificationResponse }
  }


  @post( '/apis/users/{_key}/users-rels/response-friend-request', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Response to friend request ',
      },
    },
  } )
  @authenticate( 'jwt' )
  async responseToFriendRequest (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: typeof Users.prototype._key,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( FriendRequest, {
            exclude: [ "avatar", "phone" ]
          } ),
        },
      },
    } )
    bodyReq: FriendRequest,
  )
  {
    if ( _key !== currentUserProfile[ securityId ] )
    {
      throw new HttpErrors.Unauthorized(
        'Error users response to friend request ,Token is not matched to this user _key!',
      )
    }
    if ( _key === bodyReq.requesterId.split( '/' )[ 1 ] )
    {
      throw new HttpErrors.NotAcceptable( "requester's key and recipient's key is the same! " )
    }

    let requesterUser: Users | null,
      recipientUser: Users,
      usersRelation: UsersRels,
      usersRelationList: UsersRels[],
      vu: VirtualUsers,
      notificationResponse,
      response = {}

    recipientUser = await this.usersRepository.findById( _key )
    requesterUser = await this.usersRepository.findById( bodyReq.requesterId.split( '/' )[ 1 ] )
    if ( !requesterUser ) throw new HttpErrors.NotFound( 'Requester user is not found! ' )

    usersRelationList = await this.usersRepository.usersRels(
      bodyReq.requesterId.split( '/' )[ 1 ] ).find( {
        where: {
          and: [
            { _key: bodyReq.relationId.split( '/' )[ 1 ] },
            { _to: bodyReq.virtualUserId },
            { _from: bodyReq.requesterId },
            { targetUsersId: recipientUser?._id }
          ]
        }
      } )
    if ( usersRelationList.length === 0 )
    {
      console.log( 'There is not friend request fired!' )
      throw new HttpErrors.NotFound( 'There is not fired friend request!' )
    }
    usersRelation = usersRelationList[ 0 ]

    if ( recipientUser && requesterUser )
    {
      const payload: admin.messaging.MessagingPayload = {
        notification: { title: '', body: '', },
        data: {
          alias: usersRelation.alias, avatar: recipientUser.avatar,
          usersRelationId: usersRelation._key[ 1 ]
        },
      }
      const options: admin.messaging.MessagingOptions = {
        priority: 'normal',
        contentAvailable: true,
        mutableContent: false,
      }

      if ( bodyReq.status )
      {
        payload.notification = {
          title: 'دنگیپ قبول درخواست دوستی',
          body: `${ usersRelation.alias } با موبایل ${ recipientUser.phone } در خواست دوستیتون رو پذیرفت`,
        }

        try
        {
          vu = await this.virtualUsersRepository
            .findById( bodyReq.virtualUserId.split( '/' )[ 1 ] )
          // Delete created virtual user
          await this.virtualUsersRepository.
            deleteById( bodyReq.virtualUserId.split( '/' )[ 1 ] )
        } catch ( error )
        {
          console.log( 'virtualUser deletebyId error' + error )
          throw new HttpErrors.NotAcceptable( error )
        }

        try
        {
          // Update relation _to property with real-user's _id
          await this.usersRelsRepository.updateById( bodyReq.relationId.split( '/' )[ 1 ], {
            _to: recipientUser._id, type: 'real', avatar: recipientUser.avatar
          } )
        } catch ( error )
        {
          // Create deleted virtual user in previous phase
          await this.virtualUsersRepository.create( vu )
          console.log( 'Create deleted virual user again, cause of previous phase error' )
          console.log( 'userRels updatebyId error' + error )
          throw new HttpErrors.NotAcceptable( error )
        }

        // Create relation from recipient to requester
        const usersRel = await this.usersRepository.usersRels( _key ).create( {
          _from: recipientUser._id, _to: requesterUser._id,
          alias: bodyReq.alias, type: 'real', avatar: requesterUser.avatar
        } )
        response = { ...usersRel, message: 'You are friends together right now' }
      } else
      {
        payload.notification = {
          title: 'دنگیپ رد درخواست دوستی',
          body: `${ usersRelation.alias } با موبایل ${ recipientUser.phone } در خواست دوستیتون رو رد کرد`,

        }
        response = { message: 'Friend request has been rejected' }
      }

      // send response to friend request notification to the requester
      await admin
        .messaging()
        .sendToDevice( requesterUser.registerationToken, payload, options )
        .then( function ( _response )
        {
          console.log( `Successfully set a friend, ${ _response }` )
          notificationResponse = _response
        } )
        .catch( function ( _error )
        {
          console.log( `Sending notification failed, ${ _error }` )
          notificationResponse = _error
        } )
      return { ...response, notificationResponse }
    }
  }


  @patch( '/apis/users/{_key}/users-rels', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.UsersRels PATCH success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  } )
  @authenticate( 'jwt' )
  async patch (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: string,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( UsersRels, {
            partial: true,
            exclude: [ "_from", "_to", "_rev", "type", "usersId", "targetUsersId" ],
          } ),
        },
      },
    } )
    usersRels: Partial<UsersRels>,
    @param.query.object( 'where', getWhereSchemaFor( UsersRels ) ) where?: Where<UsersRels>,
  ): Promise<Count>
  {
    if ( _key !== currentUserProfile[ securityId ] )
    {
      throw new HttpErrors.Unauthorized(
        'Error users response to friend request ,Token is not matched to this user _key!',
      )
    }
    return this.usersRepository.usersRels( _key ).patch( usersRels, where )
  }
}
