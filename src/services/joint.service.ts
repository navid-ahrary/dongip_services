import {injectable, BindingScope, service, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import util from 'util';
import moment from 'moment';

import {LocalizedMessages} from '../application';
import {
  Categories,
  Dongs,
  JointAccounts,
  Notifications,
  Users,
} from '../models';
import {
  BillListRepository,
  CategoriesRepository,
  DongsRepository,
  JointAccountSubscribesRepository,
  NotificationsRepository,
  UsersRelsRepository,
  UsersRepository,
} from '../repositories';
import {BatchMessage, FirebaseService} from './firebase.service';

export interface Joint {
  title?: string;
  desc?: string;
  dongId: number;
  dongAmount: number;
  currency: string;
  createdAt: string;
  categoryTitle: string;
  categoryIcon: string;
  billListId: number;
}

@injectable({scope: BindingScope.TRANSIENT})
export class JointService {
  constructor(
    @service(FirebaseService) public firebaserService: FirebaseService,
    @repository(NotificationsRepository)
    public notifyRepo: NotificationsRepository,
    @repository(JointAccountSubscribesRepository)
    public jointAccSubscribeRepo: JointAccountSubscribesRepository,
    @repository(CategoriesRepository)
    public catgoryRepo: CategoriesRepository,
    @repository(UsersRepository) public userRepo: UsersRepository,
    @repository(UsersRelsRepository) public userRelRepo: UsersRelsRepository,
    @repository(BillListRepository) public billListRepo: BillListRepository,
    @repository(DongsRepository) public dongRepo: DongsRepository,
    @inject('application.localizedMessages')
    protected locMsg: LocalizedMessages,
  ) {}

  async submit(
    currentUserId: typeof Users.prototype.userId,
    currentUserPhone: typeof Users.prototype.phone,
    jointAcountId: typeof JointAccounts.prototype.jointAccountId,
    currentUserCategory: Categories,
    data: Joint,
  ) {
    const JAS = await this.jointAccSubscribeRepo.find({
      where: {jointAccountId: jointAcountId, userId: {neq: currentUserId}},
      include: [
        {
          relation: 'user',
          scope: {
            fields: {userId: true, firebaseToken: true, phone: true},
            include: [
              {
                relation: 'setting',
                scope: {
                  fields: {userId: true, language: true, settingId: true},
                },
              },
              {
                relation: 'categories',
                scope: {
                  where: {title: currentUserCategory.title},
                },
              },
              {
                relation: 'usersRels',
                scope: {
                  fields: {userId: true, userRelId: true, name: true},
                  where: {phone: currentUserPhone},
                },
              },
            ],
          },
        },
      ],
    });

    const firebaseMessagesList: BatchMessage = [];

    for (const ja of JAS) {
      const cat = ja.user.categories
        ? ja.user.categories[0]
        : await this.userRepo.categories(ja.user.getId()).create({
            title: currentUserCategory.title,
            icon: currentUserCategory.icon,
          });

      const dongEnt = new Dongs({
        title: data.title,
        createdAt: data.createdAt,
        categoryId: cat.getId(),
        desc: data.desc,
        pong: data.dongAmount,
        currency: data.currency,
      });

      const savedDong = await this.userRepo
        .dongs(ja.user.getId())
        .create(dongEnt);
      await this.userRepo.billList(ja.user.getId()).create({
        categoryId: cat.getId(),
        dongId: savedDong.getId(),
        userRelId: ja.user.usersRels[0].getId(),
        jointAccountId: jointAcountId,
        dongAmount: data.dongAmount,
        currency: data.currency,
        createdAt: data.createdAt,
      });

      const currency = this.locMsg['CURRENCY'][ja.user!.setting.language][
        data.currency
      ];
      const dongAmount = data.dongAmount;

      const notifyData = new Notifications({
        userId: ja.user!.getId(),
        title: this.locMsg['JOINT_NOTIFY_TITLE'][ja.user!.setting.language],
        body: util.format(
          this.locMsg['JOINT_NOTIFY_BODY'][ja.user!.setting.language],
          dongAmount,
          currency,
          ja.user.usersRels[0].name,
        ),
        desc: savedDong.desc,
        dongId: savedDong.getId().toString(),
        dongAmount: dongAmount,
        currency: savedDong.currency,
        categoryTitle: cat.title,
        categoryIcon: cat.icon,
        userRelId: ja.user.usersRels[0].getId(),
        type: 'jointAccount',
        createdAt: moment(data.createdAt).utc().toISOString(),
      });
      const createdNotify = await this.notifyRepo.create(notifyData);

      firebaseMessagesList.push({
        token: ja.user!.firebaseToken!,
        notification: {
          title: createdNotify.title,
          body: createdNotify.body,
        },
        data: {
          notifyId: createdNotify.getId().toString(),
          title: createdNotify.title!,
          body: createdNotify.body!,
          desc: createdNotify.desc!,
          type: createdNotify.type,
          categoryTitle: createdNotify.categoryTitle!,
          categoryIcon: createdNotify.categoryIcon!,
          createdAt: createdNotify.createdAt!.toString(),
          userRelId: createdNotify.userRelId!.toString(),
          dongAmount: createdNotify.dongAmount!.toString(),
          currency: createdNotify.currency!,
          dongId: createdNotify.dongId!.toString(),
        },
      });
    }

    await this.firebaserService.sendAllMessage(firebaseMessagesList);
  }
}
