/* eslint-disable prefer-const */
import { BindingScope, inject, injectable, service } from '@loopback/core';
import { DataObject, repository } from '@loopback/repository';
import { HttpErrors, RequestContext } from '@loopback/rest';
import _ from 'lodash';
import moment from 'moment';
import util from 'util';
import { CategoriesSourceListBindings, LocMsgsBindings } from '../keys';
import {
  BillList,
  Categories,
  Dongs,
  Notifications,
  PayerList,
  PostDongDto,
  Receipts,
  Users,
} from '../models';
import {
  BillListRepository,
  CategoriesRepository,
  JointAccountsRepository,
  JointAccountSubscribesRepository,
  PayerListRepository,
  ReceiptsRepository,
  UsersRelsRepository,
  UsersRepository,
} from '../repositories';
import { CategoriesSource, LocalizedMessages } from '../types';
import { BatchMessage, FirebaseService } from './firebase.service';

@injectable({ scope: BindingScope.TRANSIENT })
export class DongService {
  static readonly NEW_DONG_SCORE = 50;
  static readonly MUTUAL_FRIEND_SCORE = 20;
  private readonly lang: string;

  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(LocMsgsBindings) private locMsg: LocalizedMessages,
    @inject(CategoriesSourceListBindings) private catSrc: CategoriesSource,
    @service(FirebaseService) private firebaseSerice: FirebaseService,
    @repository(UsersRepository) private usersRepository: UsersRepository,
    @repository(ReceiptsRepository) private receiptRepo: ReceiptsRepository,
    @repository(BillListRepository) private billListRepository: BillListRepository,
    @repository(UsersRelsRepository) private usersRelsRepository: UsersRelsRepository,
    @repository(PayerListRepository) private payerListRepository: PayerListRepository,
    @repository(CategoriesRepository) private categoriesRepository: CategoriesRepository,
    @repository(JointAccountsRepository) private jointAccRepository: JointAccountsRepository,
    @repository(JointAccountSubscribesRepository)
    private jointAccSubRepository: JointAccountSubscribesRepository,
  ) {
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  public numberWithCommas(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  public async createDongs(
    userId: number,
    newDong: PostDongDto,
  ): Promise<DataObject<Dongs> & { score: number }> {
    let mutualFactor = 0;

    delete newDong.userId;
    delete newDong.dongId;

    let billList = newDong.billList,
      payerList = newDong.payerList,
      allUsersRelsIdList: number[] = [],
      currentUserIsPayer: Boolean = false,
      firebaseMessagesList: BatchMessage = [];

    payerList.forEach(item => {
      if (!allUsersRelsIdList.includes(item.userRelId)) {
        allUsersRelsIdList.push(item.userRelId);
      }
    });

    billList.forEach(item => {
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
            where: { categoryId: newDong.categoryId, deleted: false },
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
              deleted: false,
            },
          },
        },
        {
          relation: 'jointAccountSubscribes',
          scope: {
            where: {
              jointAccountId: newDong.jointAccountId ?? null,
              deleted: false,
            },
          },
        },
      ],
    });

    const usersRels = currentUser.usersRels;
    const exterUserRelsList = _.filter(usersRels, ur => ur.type !== 'self');
    const selfUserRel = _.find(usersRels, ur => ur.type === 'self');

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

    // Create a Dongs entity object
    const dong = new Dongs({
      title: newDong.title,
      createdAt: newDong.createdAt,
      categoryId: newDong.categoryId,
      desc: newDong.desc,
      pong: newDong.pong,
      currency: newDong.currency,
      jointAccountId: newDong.jointAccountId,
      includeBudget: _.isNull(newDong.includeBudget) ? undefined : newDong.includeBudget,
      includeBill: _.isNull(newDong.includeBill) ? undefined : newDong.includeBill,
      income: _.isNull(newDong.income) ? undefined : newDong.income,
      walletId: newDong.walletId,
      accountId: newDong.accountId,
    });

    try {
      const createdDong = await this.usersRepository.dongs(userId).create(dong);

      if (newDong.receiptId) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.applyReceipt({
          userId: userId,
          dongId: createdDong.getId(),
          receiptId: newDong.receiptId,
        });
      }

      payerList.forEach(item => {
        _.assign(item, {
          userId: userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
          currency: createdDong.currency,
          jointAccountId: createdDong.jointAccountId,
          userRelName: usersRels.find(rel => rel.getId() === item.userRelId)?.name,
        });
      });

      billList.forEach(item => {
        _.assign(item, {
          userId: userId,
          dongId: createdDong.getId(),
          createdAt: createdDong.createdAt,
          categoryId: createdDong.categoryId,
          currency: createdDong.currency,
          jointAccountId: createdDong.jointAccountId,
          userRelName: usersRels.find(rel => rel.getId() === item.userRelId)?.name,
        });
      });

      const createdPayerList = await this.payerListRepository.createAll(payerList);
      const createdBillList = await this.billListRepository.createAll(billList);

      createdDong.billList = createdBillList;
      createdDong.payerList = createdPayerList;

      const sendNotify = _.has(newDong, 'sendNotify') ? newDong.sendNotify : true;

      if (!currentUser.jointAccountSubscribes && sendNotify) {
        if (currentUserIsPayer) {
          for (const relation of exterUserRelsList) {
            const targetUser = await this.usersRepository.findOne({
              fields: { userId: true, firebaseToken: true },
              where: { phone: relation.phone },
              include: [
                {
                  relation: 'setting',
                  scope: {
                    fields: {
                      userId: true,
                      language: true,
                    },
                    where: { deleted: false },
                  },
                },
              ],
            });

            // If relation is mutual, add to notification reciever list
            if (targetUser instanceof Users) {
              const targetUserLang = targetUser.setting.language;

              const foundMutualUsersRels = await this.usersRelsRepository.findOne({
                where: {
                  phone: currentUser.phone,
                  userId: targetUser.getId(),
                  deleted: false,
                },
              });

              if (foundMutualUsersRels) {
                // Increament scoreFactor for every mutual friend contribute in this dong
                mutualFactor++;
                const foundedBill = _.find(billList, { userRelId: relation.getId() });
                const roundedDongAmount = foundedBill ? +foundedBill.dongAmount.toFixed(3) : 0;

                const notifyBodyDongAmount = this.numberWithCommas(roundedDongAmount);

                // Notification data payload
                const notifyData = new Notifications({
                  title: this.locMsg['DONGIP_NOTIFY_TITLE'][targetUserLang],
                  body: util.format(
                    this.locMsg['DONGIP_NOTIFY_BODY'][targetUserLang],
                    notifyBodyDongAmount,
                    this.locMsg['CURRENCY'][targetUserLang][createdDong.currency],
                    foundMutualUsersRels.name,
                  ),
                  desc: createdDong.desc ?? ' ',
                  type: 'dong',
                  categoryTitle: currentUser.categories[0].title,
                  categoryIcon: currentUser.categories[0].icon,
                  createdAt: moment(createdDong.createdAt).utc().toISOString(),
                  userRelId: foundMutualUsersRels.getId(),
                  dongAmount: roundedDongAmount,
                  currency: createdDong.currency,
                  dongId: createdDong.getId(),
                  receiptId: newDong.receiptId,
                });

                const createdNotify = await this.usersRepository
                  .notifications(targetUser.getId())
                  .create(notifyData);

                if (targetUser.firebaseToken) {
                  // Generate notification messages
                  firebaseMessagesList.push({
                    token: targetUser.firebaseToken,
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
                      receiptId: notifyData.receiptId?.toString() ?? ' ',
                    },
                  });
                }
              }
            }
          }

          if (firebaseMessagesList.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.firebaseSerice.sendAllMessage(firebaseMessagesList);
          }
        }
      } else if (currentUser.jointAccountSubscribes) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.submitPublicJoint(currentUser, createdDong, newDong.receiptId);
      }

      const calculatedScore =
        DongService.NEW_DONG_SCORE + mutualFactor * DongService.MUTUAL_FRIEND_SCORE;
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

  async submitPublicJoint(
    currentUser: Users,
    dong: Partial<Dongs>,
    receiptId?: typeof Receipts.prototype.receiptId,
  ) {
    try {
      const firebaseMessages: BatchMessage = [];

      const savedDong = _.clone({ ...dong, originDongId: dong.dongId });
      const billList = savedDong.billList!;
      const payerList = savedDong.payerList!;

      delete savedDong.billList;
      delete savedDong.payerList;
      delete savedDong.userId;
      delete savedDong.dongId;

      const JA = await this.jointAccRepository.findOne({
        where: {
          jointAccountId: currentUser.jointAccountSubscribes[0].jointAccountId,
          deleted: false,
        },
      });
      const JASs = await this.jointAccSubRepository.find({
        where: {
          userId: { neq: currentUser.getId() },
          jointAccountId: JA!.getId(),
          deleted: false,
        },
      });

      const currentUserCateg = currentUser.categories[0];
      const catsFa = this.catSrc['fa'];
      const catsEn = this.catSrc['en'];
      let splittedCatgTitle: string[] = [];
      const cFa = _.find(catsFa, c => c.title === currentUserCateg.title);
      if (cFa) {
        const titleEn = _.find(catsEn, c => c.id === cFa.id)?.title ?? ' ';
        splittedCatgTitle.push(titleEn);
      }
      const cEn = _.find(catsEn, c => c.title === currentUserCateg.title);
      if (cEn) {
        const titleFa = _.find(catsFa, c => c.id === cEn.id)?.title ?? ' ';
        splittedCatgTitle.push(titleFa);
      }
      splittedCatgTitle = _.concat(
        splittedCatgTitle,
        currentUserCateg.title
          .split(' ')
          .filter(v => !['and', 'or', '&', ',', '.', ';', 'و', 'یا', '،', '-'].includes(v)),
      );

      let foundReceipt: Receipts | undefined;
      if (receiptId) {
        const receipt = await this.usersRepository
          .receipts(currentUser.getId())
          .find({ where: { receiptId: receiptId, deleted: false } });

        foundReceipt = receipt.length ? receipt[0] : undefined;
      }

      for (const JAS of JASs) {
        const user = await this.usersRepository.findById(JAS.userId, {
          fields: { userId: true, firebaseToken: true, name: true },
          include: [
            {
              relation: 'setting',
              scope: { fields: { userId: true, language: true }, where: { deleted: false } },
            },
            {
              relation: 'categories',
              scope: {
                where: {
                  or: [{ title: currentUserCateg.title }, { title: { inq: splittedCatgTitle } }],
                  deleted: false,
                },
              },
            },
            {
              relation: 'usersRels',
              scope: {
                where: {
                  phone: currentUser.phone,
                  deleted: false,
                },
              },
            },
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

        let createdReceipt: Receipts | undefined;
        if (foundReceipt) {
          createdReceipt = await this.usersRepository
            .receipts(user.getId())
            .create({ dongId: createdDong.getId(), receiptName: foundReceipt.receiptName });
        }

        const billers: Array<DataObject<BillList>> = [];
        for (const biller of billList) {
          const ur = currentUser.usersRels.find(rel => rel.getId() === biller.userRelId);

          const mutualRel = await this.usersRelsRepository.findOne({
            where: { userId: user.getId(), phone: ur!.phone, deleted: false },
          });

          let userRelName = mutualRel?.name;
          if (!userRelName) {
            const target = await this.usersRepository.findOne({
              where: { phone: ur!.phone, deleted: false },
              fields: { name: true },
            });

            userRelName = target?.name;
          }

          billers.push({
            dongId: createdDong.getId(),
            userId: user.getId(),
            currency: savedDong.currency,
            categoryId: catg.getId(),
            createdAt: savedDong.createdAt,
            dongAmount: biller.dongAmount,
            jointAccountId: savedDong.jointAccountId,
            userRelName: userRelName,
            userRelId: mutualRel?.getId(),
          });
        }

        const payers: Array<DataObject<PayerList>> = [];
        for (const payer of payerList) {
          const ur = currentUser.usersRels.find(rel => rel.getId() === payer.userRelId);

          const mutualRel = await this.usersRelsRepository.findOne({
            where: { userId: user.getId(), phone: ur?.phone, deleted: false },
          });

          let userRelName = mutualRel?.name;
          if (!userRelName) {
            const target = await this.usersRepository.findOne({
              where: { phone: ur!.phone, deleted: false },
              fields: { name: true },
            });

            userRelName = target?.name;
          }

          payers.push({
            dongId: createdDong.getId(),
            userId: user.getId(),
            currency: savedDong.currency,
            categoryId: catg.getId(),
            createdAt: savedDong.createdAt,
            paidAmount: payer.paidAmount,
            jointAccountId: savedDong.jointAccountId,
            userRelName: userRelName,
            userRelId: mutualRel?.getId(),
          });
        }

        const createdPayers = await this.payerListRepository.createAll(payers);
        createdDong.payerList = createdPayers;
        const createdBills = await this.billListRepository.createAll(billers);
        createdDong.billList = createdBills;

        const lang = user.setting.language;

        const notifyData = new Notifications({
          title: util.format(this.locMsg['DONGIP_IN_GROUP_NOTIFY_TITLE'][lang], JA!.title),
          body: util.format(
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
          receiptId: createdReceipt?.receiptId,
        });

        const createdNotify = await this.usersRepository
          .notifications(user.getId())
          .create(notifyData);

        if (user.firebaseToken) {
          firebaseMessages.push({
            token: user.firebaseToken,
            notification: {
              title: notifyData.title,
              body: notifyData.body,
            },
            data: {
              notifyId: createdNotify.getId().toString(),
              dongId: notifyData.dongId!.toString(),
              jointAccountId: JA!.getId().toString(),
              title: notifyData.title!,
              body: notifyData.body!,
              desc: notifyData.desc ?? ' ',
              type: notifyData.type!,
              categoryId: catg.getId().toString(),
              categoryTitle: notifyData.categoryTitle!,
              categoryIcon: notifyData.categoryIcon!,
              userRelId: notifyData.userRelId!.toString(),
              createdAt: moment(notifyData.createdAt).toISOString(),
              receiptId: createdNotify.receiptId?.toString() ?? ' ',
              silent: 'false',
            },
          });
        }
      }

      if (firebaseMessages.length) {
        await this.firebaseSerice.sendAllMessage(firebaseMessages);
      }
    } catch (err) {
      console.error(err);
    }
  }

  public async applyReceipt(data: {
    userId: typeof Users.prototype.userId;
    dongId: typeof Dongs.prototype.dongId;
    receiptId: typeof Receipts.prototype.receiptId;
  }) {
    const foundReciptRecord = await this.receiptRepo.findOne({
      fields: { userId: true, receiptName: true },
      where: { receiptId: data.receiptId, deleted: false },
    });

    if (foundReciptRecord) {
      // Check Receipt record has been saved with current user
      if (foundReciptRecord.userId === data.userId) {
        await this.usersRepository
          .receipts(data.userId)
          .patch({ dongId: data.dongId }, { receiptId: data.receiptId });
      } else {
        await this.usersRepository
          .receipts(data.userId)
          .create({ dongId: data.dongId, receiptName: foundReciptRecord?.receiptName });
      }
    }
  }
}
