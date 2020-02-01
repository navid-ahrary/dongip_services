/* eslint-disable prefer-const */
import { Filter, repository } from '@loopback/repository'
import {
  get, getModelSchemaRef, param, post, requestBody, HttpErrors
} from '@loopback/rest'
import { SecurityBindings, UserProfile, securityId } from '@loopback/security'
import underscore from 'underscore'
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


  async userHasUsersRels (
    currentUserkey: typeof Users.prototype._key,
    edgesIds: typeof UsersRels.prototype._id[],
  ) {
    for ( let edge of edgesIds ) {
      let usersRels = await this.usersRepository
        .usersRels( currentUserkey )
        .find( { where: { _key: edge.split( '/' )[ 1 ] } } )
      console.log( usersRels )
      if ( usersRels.length === 0 ) {
        return false
      } else continue
    }
    return true
  }


  arrayHasObject ( arr: object[], obj: object ): boolean {
    for ( let ele of arr ) {
      if ( underscore.isEqual( ele, obj ) ) {
        return true
      } else continue
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
        content: { 'application/json': { schema: getModelSchemaRef( Dongs ) } },
      },
    },
  } )
  @authenticate( 'jwt' )
  async create (
    @inject( SecurityBindings.USER ) currentUserProfile: UserProfile,
    @param.path.string( '_key' ) _key: typeof Users.prototype._key,
    @requestBody( {
      content: {
        'application/json': {
          schema: getModelSchemaRef( Dongs, {
            title: 'NewDongsInUsers',
            exclude: [ "costs" ],
            optional: [ "exManKey" ],
          } ),
        },
      },
    } )
    dongs: Omit<Dongs, '_key'>,
  ): Promise<void> {
    if ( _key !== currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Error create a new dong, Token is not matched to this user _key!',
      )
    }
    interface CategoryBill {
      dongsId?: string
      dong?: number
      paidCost?: number
      calculation?: number
    }

    let exMan: Users,
      pong = 0,
      factorNodes = 0,
      edgesIds = []

    for ( const item of dongs.eqip ) {
      edgesIds.push( item.usersRelsId )
    }

    if ( dongs.exManKey ) {
      exMan = await this.usersRepository.findById( dongs.exManKey )
    } else {
      exMan = await this.usersRepository.findById( _key )
    }
    console.log( edgesIds )

    if ( !( await this.userHasUsersRels( _key, edgesIds ) ) ) {
      throw new HttpErrors.NotAcceptable( 'You have not some of these friend relations  ' )
    }



    //   for ( const item of dongs.eqip ) {
    //     if (
    //       item.usersRelsId !== exMan._key.toString() &&
    //       !exMan.friends.includes( item.usersRelsId ) &&
    //       !this.arrayHasObject( exMan.pendingFriends, {
    //         recipient: exMan._key,
    //         requester: item.usersRelsId,
    //       } ) &&
    //       !this.arrayHasObject( exMan.pendingFriends, {
    //         recipient: item.usersRelsId,
    //         requester: exMan._key,
    //       } )
    //     ) {
    //       throw new HttpErrors.NotAcceptable(
    //         'Expenses manager must be friends with all of users',
    //       )
    //     } else {
    //       pong += item[ 'paidCost' ]
    //       factorNodes += item[ 'factor' ]
    //     }
    //   }

    //   dongs.pong = pong
    //   const dong = pong / factorNodes
    //   for ( const n of dongs.eqip ) {
    //     n.dong = dong * n.factor
    //   }

    //   const transaction = await this.usersRepository.dongs( exMan._key ).create( dongs )
    //   let categoryBill: CategoryBill = { dongsId: transaction._key, dong: dong, }

    //   // find category name in expenses manager's caetgories list
    //   const expensesManagerCategoryList = await this.usersRepository
    //     .categories( exMan._key )
    //     .find( {
    //       where: { title: dongs.categoryName, },
    //     } )

    //   exMan.dongsId.push( transaction._key )
    //   await this.usersRepository.updateById( exMan._key, exMan )

    //   const registrationTokens: string[] = []
    //   for ( const n of dongs.eqip ) {
    //     let nodeCategory: Category
    //     // if (n.node === expensesManager._key.toString()) continue;
    //     const paidCost = n.paidCost

    //     categoryBill.paidCost = paidCost
    //     categoryBill.calculation = dong - paidCost

    //     const nCategory = await this.usersRepository.categories( n.usersRelsId )
    //       .find( {
    //         where: { title: dongs.categoryName, },
    //       } )

    //     if ( nCategory.length === 0 ) {
    //       //create a category with name that provided by expenses manager
    //       nodeCategory = await this.usersRepository
    //         .categories( n.usersRelsId )
    //         .create( { title: expensesManagerCategoryList[ 0 ].title } )
    //     } else if ( nCategory.length === 1 ) {
    //       nodeCategory = nCategory[ 0 ]
    //     } else {
    //       throw new HttpErrors.NotAcceptable(
    //         'Find multi category with this name for userId ' + n.usersRelsId,
    //       )
    //     }

    //     // create bill belonging to created category
    //     await this.categoryRepository.categoryBills( nodeCategory._key ).create( categoryBill )

    //     const node = await this.usersRepository.findById( n.usersRelsId )
    //     node.dongsId.push( transaction._key )
    //     await this.usersRepository.updateById( n.usersRelsId, node )

    //     // Do not add expenses manager to the reciever notification list
    //     if ( n.usersRelsId !== exMan._key.toString() ) {
    //       registrationTokens.push( node.registerationToken )
    //     }
    //   }

    //   // Generate notification message
    //   const message: admin.messaging.MulticastMessage = {
    //     notification: {
    //       title: 'دنگیپ دنگ جدید',
    //       body: `${ dongs.categoryId } توسط ${ exMan.name } دنگیپ شد`,
    //     },
    //     data: {
    //       name: exMan.name,
    //       _key: exMan._key,
    //     },
    //     tokens: registrationTokens,
    //   }

    //   //send new dong notification to the nodes
    //   await admin
    //     .messaging()
    //     .sendMulticast( message )
    //     .then( function ( _response ) {
    //       if ( _response.failureCount > 0 ) {
    //         let failedTokens: string[] = []
    //         _response.responses.forEach( ( resp, idx ) => {
    //           if ( !resp.success ) {
    //             failedTokens.push( registrationTokens[ idx ] )
    //           }
    //         } )
    //         console.log( `List of tokens that caused failure ${ failedTokens }` )
    //         throw new HttpErrors.NotImplemented(
    //           `List of tokens that caused failure ${ failedTokens }`,
    //         )
    //       }

    //       console.log( `Successfully sent notifications, ${ _response }` )
    //     } )
    //     .catch( function ( _error ) {
    //       console.log( `Error sending notifications, ${ _error }` )
    //       throw new HttpErrors.NotImplemented( `Error sending notifications, ${ _error }` )
    //     } )

    //   return { _key: transaction._key }
  }
}
