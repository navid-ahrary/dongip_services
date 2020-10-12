import {injectable, BindingScope, service, inject} from '@loopback/core';
import {repository} from '@loopback/repository';

import {LocalizedMessages} from '../application';
import {Dongs, JointAccounts, Notifications, Users} from '../models';
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
    jointAcountId: typeof JointAccounts.prototype.jointAccountId,
    data: Joint,
  ) {
    const JAS = await this.jointAccSubscribeRepo.find({
      fields: {jointAccountSubscribeId: false},
      where: {jointAccountId: jointAcountId},
      include: [
        {
          relation: 'user',
          scope: {
            fields: {
              userId: true,
              firebaseToken: true,
              phone: true,
              setting: true,
              userRels: true,
              categories: true,
            },
            include: [
              {
                relation: 'setting',
                scope: {
                  fields: {userId: true, language: true, settingId: true},
                },
              },
              {
                relation: 'categories',
                scope: {fields: {userId: true, categoryId: true}},
              },
              {
                relation: 'userRels',
                scope: {fields: {userId: true, userRelId: true}},
              },
            ],
          },
        },
      ],
    });

    console.log(JAS);

    // const firebaseMessagesList: BatchMessage = [];
    // for (const ja of JAS) {
    //   const dong = new Dongs({
    //     title: data.title,
    //     createdAt: data.createdAt,
    //     categoryId: 9,
    //     desc: data.desc,
    //     pong: data.dongAmount,
    //     currency: data.currency,
    //   });
    //   const savedDong = await this.dongRepo.create(dong);
    //   await this.dongRepo.billList(savedDong.getId()).create({
    //     dongAmount: data.dongAmount,
    //     currency: data.currency,
    //     jointAccountId: jointAcountId,
    //     userRelId: 1,
    //     createdAt: data.createdAt,
    //   });

    //   const notifyData = new Notifications({
    //     userId: ja.user!.getId(),
    //     title: this.locMsg['JOINT_NOTIFY_TITLE'][ja.user!.setting.language],
    //     body: this.locMsg['JOINT_NOTIFY_BODY'][ja.user!.setting.language],
    //     desc: savedDong.desc,
    //     dongId: savedDong.getId().toString(),
    //     dongAmount: data.dongAmount,
    //     currency: savedDong.currency,
    //     categoryTitle: data.categoryTitle,
    //     categoryIcon: data.categoryIcon,
    //     userRelId: 1,
    //     type: 'jointAccount',
    //     createdAt: data.createdAt,
    //   });
    //   const createdNotify = await this.notifyRepo.create(notifyData);

    //   firebaseMessagesList.push({
    //     token: ja.user!.firebaseToken!,
    //     notification: {
    //       title: notifyData.title,
    //       body: notifyData.body,
    //     },
    //     data: {
    //       notifyId: createdNotify.getId().toString(),
    //       title: notifyData.title!,
    //       body: notifyData.body!,
    //       desc: notifyData.desc!,
    //       type: 'jointAccount',
    //       categoryTitle: notifyData.categoryTitle!,
    //       categoryIcon: notifyData.categoryIcon!,
    //       createdAt: notifyData.createdAt!,
    //       userRelId: notifyData.userRelId!.toString(),
    //       dongAmount: notifyData.dongAmount!.toString(),
    //       currency: createdNotify.currency!,
    //       dongId: notifyData.dongId!.toString(),
    //     },
    //   });
    // }

    // await this.firebaserService.sendAllMessage(firebaseMessagesList);
  }
}
