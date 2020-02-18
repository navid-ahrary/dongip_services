/* eslint-disable prefer-const */
import { bind, BindingScope, service } from '@loopback/core'
import { UsersRepository, CategoryBillRepository } from '../repositories'
import { repository } from '@loopback/repository'
import { Dongs, UsersRels, Category } from '../models'
import { HttpErrors } from '@loopback/rest'
import { NotificationService } from './'

@bind( { scope: BindingScope.SINGLETON } )
export class DongsService {
  constructor (
    @repository( UsersRepository ) private usersRepository: UsersRepository,
    @repository( CategoryBillRepository )
    private categoryBillRepository: CategoryBillRepository,
    @service( NotificationService ) private notificationService: NotificationService
  ) { }


  private async getNodesIds ( _key: string, usersRelsIdsList: string[] )
    : Promise<false | string[]> {

    const usersIdsList: string[] = []
    for ( const id of usersRelsIdsList ) {
      const relList = await this.usersRepository.usersRels( `Users${ _key }` )
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


  async createNewDong (
    _key: string,
    newDong: Omit<Dongs, '_key'>,
  ) {
    let xManUsersRel: UsersRels[],
      xManKey: string,
      xManUsersRelId = newDong.xManUsersRelId,
      usersRelsIdsList: string[] = [],
      bill = newDong.bill,
      nodes: string[] | false = [],
      pong = 0,
      dong = 0,
      factorNodes = 0,
      transaction: Dongs,
      categoryId: string = newDong.categoryId,
      categoryBillKeysList: string[] = [],
      xManCategory: Category,
      findedCategoryList: Category[]

    delete newDong.categoryId
    delete newDong.xManUsersRelId
    delete newDong.bill

    usersRelsIdsList.push( xManUsersRelId )
    for ( const _b of bill ) {
      usersRelsIdsList.push( _b.usersRelId )

      const relList = await this.usersRepository.usersRels( `Users/${ _key }` )
        .find( { where: { _id: _b.usersRelId } } )

      if ( relList.length === 0 ) {
        throw new HttpErrors.NotAcceptable(
          'You have not relation with some of users!' )
      } else {
        _b.userId = ( relList[ 0 ]._to )
      }
      if ( relList[ 0 ]._to === relList[ 0 ]._from ) continue

      nodes.push( relList[ 0 ]._to )
    }

    xManUsersRel = await this.usersRepository.usersRels( `Users/${ _key }` )
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

    switch ( newDong.factorType ) {
      case 'coefficient':
        for ( const _b of bill ) {
          factorNodes += _b.factor
          pong += _b.paid
        }
        newDong.pong = pong
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

    transaction = await this.usersRepository.createHumanKindDongs( xManKey, newDong )

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

      const userRel = await this.usersRepository.usersRels( _b.userId )
        .find( {
          where: {
            _to: `Users/${ xManKey }`
          }
        } )

      nodeCategoryBill = {
        _from: transaction._id,
        usersRelId: userRel[ 0 ]._id,
        dong: - _b.dong,
        paid: _b.paid,
        belongsToCategoryKey: nodeCategory._key,
        factor: _b.factor,
        guest: _b.guest,
        invoice: _b.paid - _b.dong,
        settled: false
      }
      if ( nodeCategoryBill.invoice >= 0 ) {
        Object.assign( nodeCategoryBill,
          { 'settledAt': newDong.createdAt, settled: true } )
      }

      await this.usersRepository.createHumanKindCategoryBills(
        _b.userId, nodeCategoryBill )
        .then( _catBill => {
          categoryBillKeysList.push( _catBill._key )
        } )
        .catch( async _err => {
          await this.usersRepository.dongs( xManKey ).delete( { _key: transaction._key } )
          await this.categoryBillRepository.deleteAll( { _from: transaction._id } )
          throw new HttpErrors[ 422 ]( _err.message )
        } )

      const user = await this.usersRepository.findById( _b.userId.split( '/' )[ 1 ] )
      // Do not add expenses manager to the reciever notification list
      if ( _b.userId.split( '/' )[ 1 ] === xManKey ) continue
      // Generate notification message
      const options = {
        priority: 'high',
        mutableContent: false,
      }
      const notifyPayload = {
        notification: {
          title: 'دنگیپ دنگ جدید',
          body: `${ nodeCategory.title } توسط ${ userRel[ 0 ].alias } دنگیپ شد`,
        },
        data: {}
      }

      this.notificationService.sendToDeviceMessage(
        user.registerationToken, notifyPayload, options
      )
    }

    return transaction
  }
}
