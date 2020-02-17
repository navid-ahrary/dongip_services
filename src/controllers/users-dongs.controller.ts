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
import { UsersRepository, CategoryBillRepository } from '../repositories'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'


export class UsersDongsController {
  constructor (
    @repository( UsersRepository ) private usersRepository: UsersRepository,
    @repository( CategoryBillRepository )
    private categoryBillRepository: CategoryBillRepository
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
      bill = dongs.bill,
      nodes: string[] | false,
      pong = 0,
      dong = 0,
      factorNodes = 0,
      transaction: Dongs,
      categoryId: string = dongs.categoryId,
      categoryBillKeysList: string[] = [],
      xManCategory: Category,
      registrationTokens: string[] = [],
      findedCategoryList: Category[]

    delete dongs.categoryId
    delete dongs.xManUsersRelId
    delete dongs.bill

    usersRelsIdsList.push( xManUsersRelId )
    for ( const _b of bill ) {
      usersRelsIdsList.push( _b.usersRelId )

      const relList = await this.usersRepository.usersRels( _key )
        .find( { where: { _id: _b.usersRelId } } )

      if ( relList.length === 0 ) {
        throw new HttpErrors.NotAcceptable(
          'You have not relation with some of users!' )
      } else {
        _b.userId = ( relList[ 0 ]._to )
      }
    }

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

    // If current user is not the same as the xMan,
    // check that xMan has relation with all eqip users
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

    // find category name in current suer's categories list
    findedCategoryList = await this.usersRepository.categories( _key )
      .find( { where: { _id: categoryId }, } )

    if ( findedCategoryList.length !== 1 ) {
      throw new HttpErrors.NotAcceptable( 'This category is not avaiable!' )
    }
    xManCategory = findedCategoryList[ 0 ]

    switch ( dongs.factorType ) {
      case 'coefficient':
        for ( const _b of bill ) {
          factorNodes += _b.factor
          pong += _b.paid
        }
        dongs.pong = pong
        dong = pong / factorNodes
        for ( const _b of bill ) {
          _b.dong = dong * _b.factor
        }
        break

      case 'amount':
        throw new HttpErrors.NotImplemented( 'Not implemented yet!' )

      case 'percent':
        throw new HttpErrors.NotImplemented( 'Not implemented yet!' )
    }

    transaction = await this.usersRepository.createHumanKindDongs( xManKey, dongs )
    for ( const _b of bill ) {
      let nodeCategory: Category,
        nodeCategoryBill

      const findCategory = await this.usersRepository.categories( _b.userId.split( '/' )[ 1 ] )
        .find( { where: { title: xManCategory.title } } )

      if ( findCategory.length !== 1 ) {
        nodeCategory = await this.usersRepository.createHumanKindCategory(
          _b.userId.split( '/' )[ 1 ], {
          title: xManCategory.title,
          icon: xManCategory.icon
        } )
      } else {
        nodeCategory = findCategory[ 0 ]
      }

      nodeCategoryBill = {
        _from: transaction._id,
        usersRelId: _b.usersRelId,
        dong: - _b.dong,
        paid: _b.paid,
        belongsToCategoryKey: nodeCategory._key,
        factor: _b.factor,
        guest: _b.guest,
        calculation: _b.paid - _b.dong,
        settled: false
      }
      if ( nodeCategoryBill.calculation >= 0 ) {
        Object.assign( nodeCategoryBill,
          { 'settledAt': dongs.createdAt, settled: true } )
      }

      try {
        const catBill = await this.usersRepository.createHumanKindCategoryBills(
          _b.userId, nodeCategoryBill )
        categoryBillKeysList.push( catBill._key )
      } catch ( _err ) {
        await this.usersRepository.dongs( xManKey ).delete( { _key: transaction._key } )
        await this.categoryBillRepository.deleteAll( { _from: transaction._id } )
        throw new HttpErrors[ 422 ]( _err.message )
      }

      const user = await this.usersRepository.findById( _b.userId.split( '/' )[ 1 ] )
      // Do not add expenses manager to the reciever notification list
      if ( _b.userId.split( '/' )[ 1 ] !== xManKey ) {
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
        _key: xManUsersRel[ 0 ]._to.split( '/' )[ 1 ],
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
