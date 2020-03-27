/* eslint-disable prefer-const */
import {bind, BindingScope, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';

import Debug from 'debug';
const debug = Debug('dongip');

import {Dongs, UsersRels, Category, Users} from '../models';
import {
  UsersRepository,
  VirtualUsersRepository,
  CategoryBillRepository,
} from '../repositories';
import {FirebaseService} from './';

@bind({scope: BindingScope.SINGLETON})
export class DongsService {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(VirtualUsersRepository)
    public virtualUsersRepository: VirtualUsersRepository,
    @repository(CategoryBillRepository)
    private categoryBillRepository: CategoryBillRepository,
    @service(FirebaseService) private firebaseService: FirebaseService,
  ) {}

  private async getNodesIds(
    _key: string,
    usersRelsIdsList: string[],
  ): Promise<false | string[]> {
    const usersIdsList: string[] = [];
    for (const id of usersRelsIdsList) {
      const relList = await this.usersRepository
        .usersRels(`Users${_key}`)
        .find({where: {_id: id}});
      if (relList.length === 0) {
        return false;
      } else {
        if (usersIdsList.indexOf(relList[0]._to) > -1) {
          usersIdsList.push(relList[0]._to);
        }
      }
    }
    return usersIdsList;
  }

  public async createNewDong(
    currentUserId: string,
    newDong: Omit<Dongs, '_key'>,
  ): Promise<Dongs> {
    let exManUsersRel: UsersRels[],
      exManKey: string,
      exManId: string,
      exManUsersRelId = newDong.exManUsersRelId,
      usersRelsIdsList: string[] = [],
      bill = newDong.bill,
      nodes: string[] | false = [],
      pong = 0,
      dong = 0,
      factorNodes = 0,
      transaction: Dongs,
      categoryId: string = newDong.categoryId,
      categoryBillKeysList: string[] = [],
      exManCategory: Category,
      findedCategoryList: Category[],
      notifyPayload,
      notifyOptions = {
        priority: 'high',
        mutableContent: false,
      };

    delete newDong.categoryId;
    delete newDong.exManUsersRelId;
    delete newDong.bill;

    usersRelsIdsList.push(exManUsersRelId);
    for (const _b of bill) {
      usersRelsIdsList.push(_b.belongsToUserRelsId);

      const relList = await this.usersRepository
        .usersRels(currentUserId)
        .find({where: {_id: _b.belongsToUserRelsId}});

      if (relList.length === 0) {
        debug(
          'You have not relation with some of users!' + _b.belongsToUserRelsId,
        );
        throw new HttpErrors.NotAcceptable(
          'You have not relation with some of users!' + _b.belongsToUserRelsId,
        );
      } else {
        _b.userId = relList[0]._to;
      }
      if (relList[0]._to === relList[0]._from) continue;

      nodes.push(relList[0]._to);
    }

    exManUsersRel = await this.usersRepository
      .usersRels(currentUserId)
      .find({where: {_id: exManUsersRelId}});
    exManKey = exManUsersRel[0]._to.split('/')[1];
    exManId = exManUsersRel[0]._to;

    // If current user is not the same as the xMan,
    // check that xMan has relation with all eqip users
    if (currentUserId !== exManId) {
      usersRelsIdsList = [];
      for (const __id in nodes) {
        const relList = await this.usersRepository
          .usersRels(exManKey)
          .find({where: {_to: __id}});
        if (!relList[0]) {
          debug('xMan has not relation with some of users!');
          throw new HttpErrors.NotAcceptable(
            'xMan has not relation with some of users!',
          );
        }
        usersRelsIdsList.push(relList[0]._id);
      }
    }
    // find category name in current suer's categories list
    findedCategoryList = await this.usersRepository
      .categories(currentUserId)
      .find({where: {_id: categoryId}});

    if (findedCategoryList.length !== 1) {
      debug('This category is not avaiable!');
      throw new HttpErrors.NotAcceptable('This category is not avaiable!');
    }
    exManCategory = findedCategoryList[0];

    switch (newDong.factorType) {
      case 'coefficient':
        for (const _b of bill) {
          factorNodes += _b.factor;
          pong += _b.paid;
        }
        newDong.pong = pong;
        dong = pong / factorNodes;
        for (const _b of bill) {
          _b.dong = dong * _b.factor;
        }
        break;

      case 'amount':
        debug('Not implemented yet!');
        throw new HttpErrors.NotImplemented('Not implemented yet!');

      case 'percent':
        debug('Not implemented yet!');
        throw new HttpErrors.NotImplemented('Not implemented yet!');
    }

    transaction = await this.usersRepository.dongs(exManId).create(newDong);

    for (const _b of bill) {
      let nodeCategory,
        user: Users,
        findCategory = [],
        userRel,
        nodeCategoryBill = {
          _from: transaction._id,
          dong: -_b.dong,
          paid: _b.paid,
          factor: _b.factor,
          guest: _b.guest,
          invoice: _b.paid - _b.dong,
          settled: false,
          belongsToUserRelsId: '',
          belongsToCategoryId: '',
        };

      switch (_b.userId.split('/')[0]) {
        case 'Users':
          userRel = await this.usersRepository
            .usersRels(_b.userId)
            .find({where: {_to: exManId}});
          nodeCategoryBill['belongsToUserRelsId'] = userRel[0]._id;

          findCategory = await this.usersRepository
            .categories(_b.userId)
            .find({where: {title: exManCategory.title}});

          if (findCategory.length !== 1) {
            nodeCategory = await this.usersRepository
              .categories(_b.userId)
              .create({
                title: exManCategory.title,
                icon: exManCategory.icon,
              });
          } else {
            nodeCategory = findCategory[0];
          }
          nodeCategoryBill['belongsToCategoryId'] = nodeCategory._id;

          if (nodeCategoryBill.invoice >= 0) {
            Object.assign(nodeCategoryBill, {
              settledAt: newDong.createdAt,
              settled: true,
            });
          }

          await this.usersRepository
            .categoryBills(_b.userId)
            .create(nodeCategoryBill)
            .then((_catBill: {_key: string}) => {
              categoryBillKeysList.push(_catBill._key);
            })
            .catch(async (_err: {message: string | undefined}) => {
              await this.usersRepository
                .dongs(exManId)
                .delete({_key: transaction._key});
              await this.categoryBillRepository.deleteAll({
                _from: transaction._id,
              });
              debug(_err);
              throw new HttpErrors[422](_err.message);
            });

          // Do not add current user to the reciever notification
          if (_b.userId.split('/')[1] === exManKey) continue;

          user = await this.usersRepository.findById(_b.userId.split('/')[1]);

          notifyPayload = {
            notification: {
              title: 'دنگیپ دنگ جدید',
              body: nodeCategory.title + 'توسط' + userRel[0].alias + 'دنگیپ شد',
            },
            data: {},
          };

          this.firebaseService.sendToDeviceMessage(
            user.registerationToken,
            notifyPayload,
            notifyOptions,
          );
          break;

        case 'VirtualUsers':
          userRel = await this.virtualUsersRepository
            .usersRels(_b.userId)
            .find({where: {_to: exManId}});
          nodeCategoryBill['belongsToUserRelsId'] = userRel[0]._id;

          findCategory = await this.virtualUsersRepository
            .categories(_b.userId)
            .find({where: {title: exManCategory.title}});

          if (findCategory.length !== 1) {
            nodeCategory = await this.virtualUsersRepository
              .categories(_b.userId)
              .create({
                title: exManCategory.title,
                icon: exManCategory.icon,
              });
          } else {
            nodeCategory = findCategory[0];
          }
          nodeCategoryBill['belongsToCategoryId'] = nodeCategory._id;

          if (nodeCategoryBill.invoice >= 0) {
            Object.assign(nodeCategoryBill, {
              settledAt: newDong.createdAt,
              settled: true,
            });
          }

          await this.usersRepository
            .categoryBills(_b.userId)
            .create(nodeCategoryBill)
            .then((_catBill: {_key: string}) => {
              categoryBillKeysList.push(_catBill._key);
            })
            .catch(async (_err: {message: string | undefined}) => {
              await this.usersRepository
                .dongs(exManId)
                .delete({_key: transaction._key});
              await this.categoryBillRepository.deleteAll({
                _from: transaction._id,
              });

              debug(_err);
              throw new HttpErrors[422](_err.message);
            });
          break;
      }
    }
    return transaction;
  }
}
