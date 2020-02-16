/* eslint-disable prefer-const */
import { Filter, repository } from '@loopback/repository'
import {
  get, getModelSchemaRef, param, post, requestBody, HttpErrors
} from '@loopback/rest'
import { SecurityBindings, UserProfile, securityId } from '@loopback/security'
import _ from 'underscore'
import { authenticate } from '@loopback/authentication'
import { inject } from '@loopback/core'
import * as admin from 'firebase-admin'
import { Users, Dongs, Category, UsersRels } from '../models'
import { UsersRepository, CategoryRepository } from '../repositories'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'


export class UsersDongsController {
  constructor (
    @repository( UsersRepository ) private usersRepository: UsersRepository,
    @repository( CategoryRepository ) private categoryRepository: CategoryRepository,
  ) { }


  async getNodesIds ( _key: string, usersRelsIdsList: string[] )
    : Promise<false | string[]> {
    let usersIdsList: string[] = []
    for ( const id of usersRelsIdsList ) {
      const relList = await this.usersRepository.usersRels( _key )
        .find( { where: { _id: id } } )
      if ( relList.length === 0 ) {
        return false
      } else {
        if ( usersIdsList.indexOf( relList[ 0 ]._to ) > -1 ) {
          usersIdsList.push( relList[ 0 ]._to )
        }
      }
    }
    return usersIdsList
  }


  arrayHasObject ( arr: object[], obj: object ): boolean {
    for ( const ele of arr ) {
      if ( _.isEqual( ele, obj ) ) {
        return true
      }
    }
    return false
  }


  @get( '/apis/users/{_key}/dongs', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of Dongs's belonging to Users",
        content: {
          'application/json': {
            schema: { type: 'array', items: getModelSchemaRef( Dongs ) },
          },
        },
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async find (
    @param.path.string( '_key' ) _key: string,
    @param.query.object( 'filter' ) filter?: Filter<Dongs>,
  ): Promise<Dongs[]> {
    return this.usersRepository.dongs( _key ).find( filter )
  }


  @post( '/apis/users/{_key}/dongs', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Users.Dongs post model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef( Dongs, {
              exclude: [ "belongsToCategoryKey", "belongsToUserKey" ]
            } )
          }
        },
      },
    },
  } )
  @authenticate( 'jwt.access' )
  async create (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: typeof Users.prototype._key,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( Dongs, {
            title: 'NewDongsInUsers',
            exclude: [ "_key", "_id", "_rev", "costs", "belongsToUserKey",
              "belongsToCategoryKey" ],
          } ),
        },
      },
    } )
    dongs: Omit<Dongs, '_key'>,
  ): Promise<{ _key: string }> {
    if ( _key !== currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Error create a new dong, Token is not matched to this user _key!',
      )
    }

    let xManUsersRel: UsersRels[],
      xManKey: string,
      xManUsersRelId = dongs.xManUsersRelId,
      usersRelsIdsList: string[] = [],
      eqip = dongs.eqip,
      nodes: string[] | false,
      pong = 0,
      dong = 0,
      factorNodes = 0,
      transaction: Dongs,
      categoryId: string = dongs.categoryId,
      xManCategory: Category,
      registrationTokens: string[] = []

    delete dongs.categoryId
    delete dongs.xManUsersRelId

    usersRelsIdsList.push( xManUsersRelId )
    for ( const _node of eqip ) {
      const relList = await this.usersRepository.usersRels( _key )
        .find( { where: { _id: _node.usersRelId } } )

      if ( relList.length === 0 ) {
        throw new HttpErrors.NotAcceptable(
          'You have not relation with some of users!' )
      } else {
        _node[ 'userId' ] = ( relList[ 0 ]._to )
      }
    }
    eqip.forEach( _item => {
      usersRelsIdsList.push( _item.usersRelId )
    } )

    // Get eqip users ids
    nodes = await this.getNodesIds( _key, usersRelsIdsList )
    // Check current user has all usersRels
    if ( !nodes ) {
      throw new HttpErrors.NotAcceptable(
        'You have not relation with some of users!' )
    }

    xManUsersRel = await this.usersRepository.usersRels( _key )
      .find( { where: { _id: xManUsersRelId } } )
    xManKey = xManUsersRel[ 0 ]._to.split( '/' )[ 1 ]

    // If current user and xManare different user
    // check that xMan has relation with all eqip user
    if ( _key !== xManKey ) {
      usersRelsIdsList = []
      for ( const __id in nodes ) {
        const relList = await this.usersRepository.usersRels( xManKey )
          .find( { where: { _to: __id } } )
        if ( !relList[ 0 ] ) {
          throw new HttpErrors.NotAcceptable(
            'xMan has not relation with some of users!' )
        }
        usersRelsIdsList.push( relList[ 0 ]._id )
      }
    }

    // find category name in current suer's caetgories list
    const findedCategoryList = await this.usersRepository.categories( _key )
      .find( { where: { _id: categoryId }, } )

    if ( findedCategoryList.length !== 1 ) {
      throw new HttpErrors.NotAcceptable( 'This category is not avaiable!' )
    }
    xManCategory = findedCategoryList[ 0 ]

    switch ( dongs.factorType ) {
      case 'coefficient':
        eqip.forEach( n => {
          factorNodes += n.factor
          pong += n.paidCost
        } )
        dongs[ 'pong' ] = pong
        dong = pong / factorNodes
        eqip.forEach( n => {
          n[ 'dong' ] = dong * n.factor
        } )
        break

      case 'amount':
        throw new HttpErrors.NotImplemented( 'Not implemented yet!' )

      case 'percent':
        throw new HttpErrors.NotImplemented( 'Not implemented yet!' )
    }
    transaction = await this.usersRepository.createHumanKindDongs( xManKey, dongs )

    for ( const n of eqip ) {
      let nodeCategory: Category
      const findCategory = await this.usersRepository.categories( n.userId.split( '/' )[ 1 ] )
        .find( { where: { title: xManCategory.title } } )

      if ( findCategory.length !== 1 ) {
        nodeCategory = await this.usersRepository.createHumanKindCategory(
          n.userId.split( '/' )[ 1 ], {
          title: xManCategory.title,
          icon: xManCategory.icon
        } )
      } else {
        nodeCategory = findCategory[ 0 ]
      }

      await this.usersRepository.createHumanKindCategoryBills(
        n.userId.split( '/' )[ 1 ], {
        _from: transaction._id,
        _to: categoryId,
        dong: n.dong,
        paidCost: n.paidCost,
        belongsToCategoryKey: nodeCategory._key,
        belongsToUserKey: n.userId.split( '/' )[ 1 ],
        belongsToDongKey: transaction._key
      } )

      const user = await this.usersRepository.findById( n.userId.split( '/' )[ 1 ] )
      // Do not add expenses manager to the reciever notification list
      if ( n.userId.split( '/' )[ 1 ] !== xManKey ) {
        registrationTokens.push( user.registerationToken )
      }
    }

    // Generate notification message
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: 'دنگیپ دنگ جدید',
        body: `${ dongs.belongsToCategoryKey } توسط ${ xManUsersRel[ 0 ].alias } دنگیپ شد`,
      },
      data: {
        name: xManUsersRel[ 0 ].alias,
        _key: xManUsersRel[ 0 ]._to.split( '/' )[ 0 ],
      },
      tokens: registrationTokens,
    }

    //send new dong notification to the nodes
    admin
      .messaging()
      .sendMulticast( message )
      .then( function ( _response ) {
        if ( _response.failureCount > 0 ) {
          let failedTokens: string[] = []
          _response.responses.forEach( ( resp, idx ) => {
            if ( !resp.success ) {
              failedTokens.push( registrationTokens[ idx ] )
            }
          } )
          console.log( `List of tokens that caused failure ${ failedTokens }` )
          throw new HttpErrors.NotImplemented(
            `List of tokens that caused failure ${ failedTokens }`,
          )
        }
        console.log( `Successfully sent notifications, ${ _response }` )
      } )
      .catch( function ( _error ) {
        console.log( `Error sending notifications, ${ _error }` )
        throw new HttpErrors.NotImplemented( `Error sending notifications, ${ _error }` )
      } )
    return { _key: transaction._key }
  }
}
