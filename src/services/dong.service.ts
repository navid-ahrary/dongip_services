/* eslint-disable prefer-const */
import { injectable, inject, BindingScope, service } from '@loopback/core';
import { DataObject, repository } from '@loopback/repository';
import { HttpErrors, RequestContext } from '@loopback/rest';
import _ from 'lodash';
import Util from 'util';
import Moment from 'moment';
import { BatchMessage, FirebaseService } from './firebase.service';
import { BillList, Categories, Dongs, Notifications, PayerList, PostDong, Users } from '../models';
import {
  BillListRepository,
  CategoriesRepository,
  DongsRepository,
  JointAccountsRepository,
  JointAccountSubscribesRepository,
  PayerListRepository,
  UsersRelsRepository,
  UsersRepository,
} from '../repositories';
import { CategoriesSource, LocalizedMessages } from '../types';
import { CategoriesSourceListBindings, LocMsgsBindings } from '../keys';

@injectable({ scope: BindingScope.TRANSIENT })
export class DongService {
  lang: string;

  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(CategoriesSourceListBindings) public catSrc: CategoriesSource,
    @service(FirebaseService) private firebaseSerice: FirebaseService,
    @repository(DongsRepository) public dongRepository: DongsRepository,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BillListRepository) public billListRepository: BillListRepository,
    @repository(UsersRelsRepository) public usersRelsRepository: UsersRelsRepository,
    @repository(PayerListRepository) public payerListRepository: PayerListRepository,
    @repository(CategoriesRepository) public categoriesRepository: CategoriesRepository,
    @repository(JointAccountsRepository) public jointAccRepository: JointAccountsRepository,
    @repository(JointAccountSubscribesRepository)
    public jointAccSunRepository: JointAccountSubscribesRepository,
  ) {
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  public numberWithCommas(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  async createDongs(
    userId: typeof Users.prototype.userId,
    newDong: PostDong,
  ): Promise<DataObject<Dongs> & { score: number }> {
    const newDongScore = 50;
    const mutualFriendScore = 20;

    let mutualFactor = 0;

    delete newDong?.userId;
    delete newDong?.dongId;

    let billList = newDong.billList,
      payerList = newDong.payerList,
      allUsersRelsIdList: number[] = [],
      currentUserIsPayer: Boolean = false,
      firebaseMessagesList: BatchMessage = [];

    payerList.forEach((item) => {
      if (!allUsersRelsIdList.includes(item.userRelId)) {
        allUsersRelsIdList.push(item.userRelId);
      }
    });

    billList.forEach((item) => {
      if (!allUsersRelsIdList.includes(item.userRelId)) {
        allUsersRelsIdList.push(item.userRelId);
      }
    });

    const currentUser = await this.usersRepository.findById(userId, {
      fields: {
        userId: true,
        phone: true,
        name: true,
        jointAccounts: true,
        usersRels: true,
        categories: true,
      },
      include: [
        {
          relation: 'categories',
          scope: {
            where: { categoryId: newDong.categoryId },
          },
        },
        {
          relation: 'usersRels',
          scope: {
            fields: {
              userRelId: true,
              userId: true,
              phone: true,
              type: true,
              mutualUserRelId: true,
              name: true,
            },
            where: {
              userRelId: { inq: allUsersRelsIdList },
            },
          },
        },
        {
          relation: 'jointAccountSubscribes',
          scope: {
            where: { jointAccountId: newDong.jointAccountId ?? null },
          },
        },
      ],
    });

    const usersRels = currentUser.usersRels;
    const exterUserRelsList = _.filter(usersRels, (ur) => ur.type !== 'self');
    const selfUserRel = _.find(usersRels, (ur) => ur.type === 'self');

    if (usersRels?.length !== allUsersRelsIdList.length) {
      throw new HttpErrors.UnprocessableEntity(this.locMsg['SOME_USERS_RELS_NOT_VALID'][this.lang]);
    }
    if (newDong.jointAccountId && !currentUser.jointAccountSubscribes) {
      throw new HttpErrors.UnprocessableEntity(this.locMsg['JOINT_NOT_VALID'][this.lang]);
    }

    if (selfUserRel?.userRelId === newDong.payerList[0].userRelId) {
      currentUserIsPayer = true;
    }

    if (newDong.includeBudget === null) newDong.includeBudget = true;

    // Create a Dongs objcet
    const dong = new Dongs({
      title: newDong.title,
      createdAt: newDong.createdAt,
      categoryId: newDong.categoryId,
      desc: newDong.desc,
      pong: newDong.pong,
      currency: newDong.currency,
      jointAccountId: newDong.jointAccountId ?? undefined,
      includeBudget: newDong.includeBudget !== null ? newDong.includeBudget : undefined,
      includeBill: newDong.includeBill,
    });

    try {
      const createdDong = await this.usersRepository.dongs(userId).create(dong);

      _.forEach(payerList, (item) => {
        item = _.assign(item, {
          userId: userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
          currency: createdDong.currency,
          jointAccountId: createdDong.jointAccountId,
          userRelName: _.find(usersRels, (rel) => rel.getId() === item.userRelId)?.name,
        });
      });

      billList.forEach((item) => {
        item = _.assign(item, {
          userId: userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
          currency: createdDong.currency,
          jointAccountId: createdDong.jointAccountId,
          userRelName: _.find(usersRels, (rel) => rel.getId() === item.userRelId)?.name,
        });
      });

      const createdPayerList = await this.payerListRepository.createAll(payerList);
      const createdBillList = await this.billListRepository.createAll(billList);

      createdDong.billList = createdBillList;
      createdDong.payerList = createdPayerList;

      const sendNotify = _.has(newDong, 'sendNotify') ? newDong.sendNotify : true;

      if (!currentUser.jointAccountSubscribes && currentUserIsPayer && sendNotify) {
        for (const relation of exterUserRelsList) {
          const user = await this.usersRepository.findOne({
            where: { phone: relation.phone },
            include: [{ relation: 'setting' }],
          });

          // If relation is mutual, add to notification reciever list
          if (user instanceof Users) {
            const foundMutualUsersRels = await this.usersRelsRepository.findOne({
              where: {
                phone: currentUser.phone,
                userId: user.getId(),
              },
            });

            if (foundMutualUsersRels) {
              // Increament scoreFactor for every mutual friend contribute in dong
              mutualFactor++;
              // Get rounded dong amount
              const roundedDongAmount = _.find(billList, {
                userRelId: relation.getId(),
              })
                ? Math.floor(_.find(billList, { userRelId: relation.getId() })!.dongAmount)
                : 0;

              // Seperate thousands with "," for use in notification body
              const notifyBodyDongAmount = this.numberWithCommas(roundedDongAmount);

              // Notification data payload
              const notifyData = new Notifications({
                title: this.locMsg['DONGIP_NOTIFY_TITLE'][user!.setting.language],
                body: Util.format(
                  this.locMsg['DONGIP_NOTIFY_BODY'][user!.setting.language],
                  notifyBodyDongAmount,
                  this.locMsg['CURRENCY'][user!.setting.language][createdDong.currency],
                  foundMutualUsersRels.name,
                ),
                desc: createdDong.desc ?? '',
                type: 'dong',
                categoryTitle: currentUser.categories[0].title,
                categoryIcon: currentUser.categories[0].icon,
                createdAt: Moment(createdDong.createdAt).utc().toISOString(),
                userRelId: foundMutualUsersRels.getId(),
                dongAmount: roundedDongAmount,
                currency: createdDong.currency,
                dongId: createdDong.getId(),
              });

              const createdNotify = await this.usersRepository
                .notifications(user!.getId())
                .create(notifyData);

              // Generate notification messages
              firebaseMessagesList.push({
                token: user.firebaseToken ?? ' ',
                notification: {
                  title: notifyData.title,
                  body: notifyData.body,
                },
                data: {
                  notifyId: createdNotify.getId().toString(),
                  title: notifyData.title!,
                  body: notifyData.body!,
                  desc: notifyData.desc!,
                  type: notifyData.type!,
                  categoryTitle: notifyData.categoryTitle!,
                  categoryIcon: notifyData.categoryIcon!,
                  createdAt: notifyData.createdAt!,
                  userRelId: notifyData.userRelId!.toString(),
                  dongAmount: notifyData.dongAmount!.toString(),
                  currency: createdNotify.currency!,
                  dongId: notifyData.dongId!.toString(),
                },
              });
            }
          }
        }

        if (firebaseMessagesList.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.firebaseSerice.sendAllMessage(firebaseMessagesList);
        }
      } else if (currentUser.jointAccountSubscribes) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.submitJoint(currentUser, createdDong);
      }

      const calculatedScore = newDongScore + mutualFactor * mutualFriendScore;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.scores(userId).create({
        dongId: createdDong.getId(),
        score: calculatedScore,
      });

      return {
        ...createdDong,
        score: calculatedScore,
      };
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity(err);
    }
  }

  async submitJoint(currentUser: Users, dong: Partial<Dongs>) {
    try {
      const firebaseMessages: BatchMessage = [];

      const savedDong = _.clone({ ...dong, originDongId: dong.dongId });
      const billList = savedDong.billList!;
      const payerList = savedDong.payerList!;

      delete savedDong.billList;
      delete savedDong.payerList;
      delete savedDong.userId;
      delete savedDong.dongId;

      const JA = await this.jointAccRepository.findById(
        currentUser.jointAccountSubscribes[0].jointAccountId,
      );
      const JASs = await this.jointAccSunRepository.find({
        where: { userId: { neq: currentUser.getId() }, jointAccountId: JA.getId() },
      });

      const currentUserCateg = currentUser.categories[0];
      const catsFa = this.catSrc['fa'];
      const catsEn = this.catSrc['en'];
      let splittedCatgTitle: string[] = [];
      const cFa = _.find(catsFa, (c) => c.title === currentUserCateg.title);
      if (cFa) {
        const titleEn = _.find(catsEn, (c) => c.id === cFa.id)?.title ?? '';
        splittedCatgTitle.push(titleEn);
      }
      const cEn = _.find(catsEn, (c) => c.title === currentUserCateg.title);
      if (cEn) {
        const titleFa = _.find(catsFa, (c) => c.id === cEn.id)?.title ?? '';
        splittedCatgTitle.push(titleFa);
      }
      splittedCatgTitle = _.concat(
        splittedCatgTitle,
        currentUserCateg.title
          .split(' ')
          .filter((v) => !['and', 'or', '&', ',', '.', ';', 'و', 'یا', '،', '-'].includes(v)),
      );

      for (const JAS of JASs) {
        const user = await this.usersRepository.findById(JAS.userId, {
          fields: { userId: true, firebaseToken: true, name: true },
          include: [
            { relation: 'setting', scope: { fields: { userId: true, language: true } } },
            {
              relation: 'categories',
              scope: {
                where: {
                  or: [{ title: currentUserCateg.title }, { title: { inq: splittedCatgTitle } }],
                },
              },
            },
            { relation: 'usersRels', scope: { where: { phone: currentUser.phone } } },
          ],
        });

        let catg: Categories;
        if (user.categories) {
          catg = user.categories[0];
        } else {
          catg = await this.categoriesRepository.create({
            userId: user.getId(),
            title: currentUserCateg.title,
            icon: currentUserCateg.icon,
          });
        }

        savedDong.categoryId = catg.getId();

        const createdDong = await this.usersRepository.dongs(user.getId()).create(savedDong);

        const billers: Array<BillList> = [];
        for (const biller of billList) {
          const ur = _.find(currentUser.usersRels, (rel) => rel.getId() === biller.userRelId);

          const mutualRel = await this.usersRelsRepository.findOne({
            where: { userId: user.getId(), phone: ur!.phone },
          });

          let userRelName = mutualRel?.name;
          if (!userRelName) {
            const target = await this.usersRepository.findOne({
              where: { phone: ur!.phone },
              fields: { name: true },
            });

            userRelName = target?.name;
          }

          billers.push(
            new BillList({
              dongId: createdDong.getId(),
              userId: user.getId(),
              currency: savedDong.currency,
              categoryId: catg.getId(),
              createdAt: savedDong.createdAt,
              dongAmount: biller.dongAmount,
              jointAccountId: savedDong.jointAccountId,
              userRelName: userRelName,
              userRelId: mutualRel?.getId(),
            }),
          );
        }

        const payers: Array<PayerList> = [];
        for (const payer of payerList) {
          const ur = _.find(currentUser.usersRels, (rel) => rel.getId() === payer.userRelId);

          const mutualRel = await this.usersRelsRepository.findOne({
            where: { userId: user.getId(), phone: ur?.phone },
          });

          let userRelName = mutualRel?.name;
          if (!userRelName) {
            const target = await this.usersRepository.findOne({
              where: { phone: ur!.phone },
              fields: { name: true },
            });

            userRelName = target?.name;
          }

          payers.push(
            new PayerList({
              dongId: createdDong.getId(),
              userId: user.getId(),
              currency: savedDong.currency,
              categoryId: catg.getId(),
              createdAt: savedDong.createdAt,
              paidAmount: payer.paidAmount,
              jointAccountId: savedDong.jointAccountId,
              userRelName: userRelName,
              userRelId: mutualRel?.getId(),
            }),
          );
        }

        const createdPayers = await this.payerListRepository.createAll(payers);
        createdDong.payerList = createdPayers;
        const createdBills = await this.billListRepository.createAll(billers);
        createdDong.billList = createdBills;

        const firebaseToken = user.firebaseToken ?? ' ';
        const lang = user.setting.language;

        const notifyData = new Notifications({
          title: Util.format(this.locMsg['DONGIP_IN_GROUP_NOTIFY_TITLE'][lang], JA.title),
          body: Util.format(
            this.locMsg['DONGIP_IN_GROUP_NOTIFY_BODY'][lang],
            this.numberWithCommas(createdDong.pong!),
            this.locMsg['CURRENCY'][lang][createdDong.currency!],
            user.usersRels[0].name,
          ),
          type: 'dong-jointAccount',
          categoryTitle: catg.title,
          categoryIcon: catg.icon,
          dongId: createdDong.dongId,
          userRelId: user.usersRels[0].getId(),
          createdAt: createdDong.createdAt,
          jointAccountId: createdDong.jointAccountId,
        });

        const createdNotify = await this.usersRepository
          .notifications(user.getId())
          .create(notifyData);

        firebaseMessages.push({
          token: firebaseToken,
          notification: {
            title: notifyData.title,
            body: notifyData.body,
          },
          data: {
            notifyId: createdNotify.getId().toString(),
            dongId: notifyData.dongId!.toString(),
            jointAccountId: JA.getId().toString(),
            title: notifyData.title!,
            body: notifyData.body!,
            desc: notifyData.desc ?? '',
            type: notifyData.type!,
            categoryId: catg.getId().toString(),
            categoryTitle: notifyData.categoryTitle!,
            categoryIcon: notifyData.categoryIcon!,
            userRelId: notifyData.userRelId!.toString(),
            createdAt: Moment(notifyData.createdAt).toISOString(),
            silent: 'false',
          },
        });
      }

      if (firebaseMessages.length) {
        await this.firebaseSerice.sendAllMessage(firebaseMessages);
      }
    } catch (err) {
      console.error(err);
    }
  }
}
