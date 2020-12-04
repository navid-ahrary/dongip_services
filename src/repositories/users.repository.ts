import {
  repository,
  HasManyRepositoryFactory,
  DefaultCrudRepository,
  HasOneRepositoryFactory,
} from '@loopback/repository';
import { inject, Getter } from '@loopback/core';

import { MysqlDataSource } from '../datasources';
import {
  Users,
  VirtualUsers,
  Dongs,
  Categories,
  UsersRels,
  BillList,
  PayerList,
  Scores,
  Messages,
  Notifications,
  Budgets,
  Settings,
  Purchases,
  Subscriptions,
  JointAccounts,
  JointAccountSubscribes,
  RefreshTokens,
} from '../models';
import { BillListRepository } from './bill-list.repository';
import { PayerListRepository } from './payer-list.repository';
import { ScoresRepository } from './scores.repository';
import { MessagesRepository } from './messages.repository';
import { NotificationsRepository } from './notifications.repository';
import { BudgetsRepository } from './budgets.repository';
import { SettingsRepository } from './settings.repository';
import { PurchasesRepository } from './purchases.repository';
import { SubscriptionsRepository } from './subscriptions.repository';
import { VirtualUsersRepository } from './virtual-users.repository';
import { DongsRepository } from './dongs.repository';
import { CategoriesRepository } from './categories.repository';
import { UsersRelsRepository } from './users-rels.repository';
import { JointAccountsRepository } from './joint-accounts.repository';
import { JointAccountSubscribesRepository } from './joint-account-subscribes.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';

export class UsersRepository extends DefaultCrudRepository<Users, typeof Users.prototype.userId> {
  public readonly virtualUsers: HasManyRepositoryFactory<
    VirtualUsers,
    typeof Users.prototype.userId
  >;

  public readonly dongs: HasManyRepositoryFactory<Dongs, typeof Users.prototype.userId>;

  public readonly categories: HasManyRepositoryFactory<Categories, typeof Users.prototype.userId>;

  public readonly usersRels: HasManyRepositoryFactory<UsersRels, typeof Users.prototype.userId>;

  public readonly billList: HasManyRepositoryFactory<BillList, typeof Users.prototype.userId>;

  public readonly payerList: HasManyRepositoryFactory<PayerList, typeof Users.prototype.userId>;

  public readonly scores: HasManyRepositoryFactory<Scores, typeof Users.prototype.userId>;

  public readonly messages: HasManyRepositoryFactory<Messages, typeof Users.prototype.userId>;

  public readonly notifications: HasManyRepositoryFactory<
    Notifications,
    typeof Users.prototype.userId
  >;

  public readonly budgets: HasManyRepositoryFactory<Budgets, typeof Users.prototype.userId>;

  public readonly setting: HasOneRepositoryFactory<Settings, typeof Users.prototype.userId>;

  public readonly purchases: HasManyRepositoryFactory<Purchases, typeof Users.prototype.userId>;

  public readonly subscriptions: HasManyRepositoryFactory<
    Subscriptions,
    typeof Users.prototype.userId
  >;

  public readonly jointAccounts: HasManyRepositoryFactory<
    JointAccounts,
    typeof Users.prototype.userId
  >;

  public readonly jointAccountSubscribes: HasManyRepositoryFactory<
    JointAccountSubscribes,
    typeof Users.prototype.userId
  >;

  public readonly refreshToken: HasOneRepositoryFactory<
    RefreshTokens,
    typeof Users.prototype.userId
  >;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('VirtualUsersRepository')
    protected virtualUsersRepositoryGetter: Getter<VirtualUsersRepository>,
    @repository.getter('DongsRepository')
    protected dongsRepositoryGetter: Getter<DongsRepository>,
    @repository.getter('CategoriesRepository')
    protected categoryRepositoryGetter: Getter<CategoriesRepository>,
    @repository.getter('UsersRelsRepository')
    protected usersRelsRepositoryGetter: Getter<UsersRelsRepository>,
    @repository.getter('BillListRepository')
    protected billListRepositoryGetter: Getter<BillListRepository>,
    @repository.getter('PayerListRepository')
    protected payerListRepositoryGetter: Getter<PayerListRepository>,
    @repository.getter('ScoresRepository')
    protected scoresRepositoryGetter: Getter<ScoresRepository>,
    @repository.getter('MessagesRepository')
    protected messagesRepositoryGetter: Getter<MessagesRepository>,
    @repository.getter('NotificationsRepository')
    protected notificationsRepositoryGetter: Getter<NotificationsRepository>,
    @repository.getter('BudgetsRepository')
    protected budgetsRepositoryGetter: Getter<BudgetsRepository>,
    @repository.getter('SettingsRepository')
    protected settingsRepositoryGetter: Getter<SettingsRepository>,
    @repository.getter('PurchasesRepository')
    protected purchasesRepositoryGetter: Getter<PurchasesRepository>,
    @repository.getter('SubscriptionsRepository')
    protected subscriptionsRepositoryGetter: Getter<SubscriptionsRepository>,
    @repository.getter('JointAccountsRepository')
    protected jointAccountsRepositoryGetter: Getter<JointAccountsRepository>,
    @repository.getter('JointAccountSubscribesRepository')
    protected jointAccountSubscribesRepositoryGetter: Getter<JointAccountSubscribesRepository>,
    @repository.getter('RefreshTokensRepository')
    protected refreshTokensRepositoryGetter: Getter<RefreshTokensRepository>,
  ) {
    super(Users, dataSource);

    this.refreshToken = this.createHasOneRepositoryFactoryFor(
      'refreshToken',
      refreshTokensRepositoryGetter,
    );
    this.registerInclusionResolver('refreshToken', this.refreshToken.inclusionResolver);

    this.jointAccountSubscribes = this.createHasManyRepositoryFactoryFor(
      'jointAccountSubscribes',
      jointAccountSubscribesRepositoryGetter,
    );
    this.registerInclusionResolver(
      'jointAccountSubscribes',
      this.jointAccountSubscribes.inclusionResolver,
    );

    this.jointAccounts = this.createHasManyRepositoryFactoryFor(
      'jointAccounts',
      jointAccountsRepositoryGetter,
    );
    this.registerInclusionResolver('jointAccounts', this.jointAccounts.inclusionResolver);

    this.subscriptions = this.createHasManyRepositoryFactoryFor(
      'subscriptions',
      subscriptionsRepositoryGetter,
    );
    this.registerInclusionResolver('subscriptions', this.subscriptions.inclusionResolver);

    this.purchases = this.createHasManyRepositoryFactoryFor('purchases', purchasesRepositoryGetter);
    this.registerInclusionResolver('purchases', this.purchases.inclusionResolver);

    this.setting = this.createHasOneRepositoryFactoryFor('setting', settingsRepositoryGetter);
    this.registerInclusionResolver('setting', this.setting.inclusionResolver);

    this.budgets = this.createHasManyRepositoryFactoryFor('budgets', budgetsRepositoryGetter);
    this.registerInclusionResolver('budgets', this.budgets.inclusionResolver);

    this.notifications = this.createHasManyRepositoryFactoryFor(
      'notifications',
      notificationsRepositoryGetter,
    );
    this.registerInclusionResolver('notifications', this.notifications.inclusionResolver);

    this.messages = this.createHasManyRepositoryFactoryFor('messages', messagesRepositoryGetter);
    this.registerInclusionResolver('messages', this.messages.inclusionResolver);

    this.scores = this.createHasManyRepositoryFactoryFor('scores', scoresRepositoryGetter);
    this.registerInclusionResolver('scores', this.scores.inclusionResolver);

    this.payerList = this.createHasManyRepositoryFactoryFor('payerList', payerListRepositoryGetter);
    this.registerInclusionResolver('payerList', this.payerList.inclusionResolver);

    this.billList = this.createHasManyRepositoryFactoryFor('billList', billListRepositoryGetter);
    this.registerInclusionResolver('billList', this.billList.inclusionResolver);

    this.usersRels = this.createHasManyRepositoryFactoryFor('usersRels', usersRelsRepositoryGetter);

    this.registerInclusionResolver('usersRels', this.usersRels.inclusionResolver);

    this.categories = this.createHasManyRepositoryFactoryFor(
      'categories',
      categoryRepositoryGetter,
    );
    this.registerInclusionResolver('categories', this.categories.inclusionResolver);

    this.dongs = this.createHasManyRepositoryFactoryFor('dongs', dongsRepositoryGetter);
    this.registerInclusionResolver('dongs', this.dongs.inclusionResolver);

    this.virtualUsers = this.createHasManyRepositoryFactoryFor(
      'virtualUsers',
      virtualUsersRepositoryGetter,
    );
    this.registerInclusionResolver('virtualUsers', this.virtualUsers.inclusionResolver);
  }
}
