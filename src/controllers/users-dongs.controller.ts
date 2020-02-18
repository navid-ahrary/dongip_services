/* eslint-disable prefer-const */
import { Filter, repository } from '@loopback/repository'
import {
  get, getModelSchemaRef, param, post, requestBody, HttpErrors
} from '@loopback/rest'
import { SecurityBindings, UserProfile, securityId } from '@loopback/security'
import _ from 'underscore'
import { authenticate } from '@loopback/authentication'
import { inject, service } from '@loopback/core'
import { Users, Dongs, } from '../models'
import { UsersRepository, CategoryBillRepository } from '../repositories'
import { OPERATION_SECURITY_SPEC } from '../utils/security-specs'
import { DongsService } from '../services'


export class UsersDongsController {
  constructor (
    @service( DongsService ) private dongsService: DongsService,
    @repository( UsersRepository ) private usersRepository: UsersRepository,
    @repository( CategoryBillRepository )
    private categoryBillRepository: CategoryBillRepository,
    @inject( SecurityBindings.USER ) private currentUserProfile: UserProfile,
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
  ): Promise<Dongs> {
    if ( _key !== this.currentUserProfile[ securityId ] ) {
      throw new HttpErrors.Unauthorized(
        'Error create a new dong, Token is not matched to this user _key!',
      )
    }
    return this.dongsService.createNewDong( _key, dongs )
  }
}
