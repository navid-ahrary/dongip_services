import { Getter, inject } from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  HasManyThroughRepositoryFactory,
  HasOneRepositoryFactory,
  repository,
} from '@loopback/repository';
import { MariadbDataSource } from '../datasources';
import {
  Accounts,
  BillList,
  Budgets,
  Categories,
  Dongs,
  GroupParticipants,
  Groups,
  JointAccounts,
  JointAccountSubscribes,
  Messages,
  Notifications,
  PayerList,
  Purchases,
  Receipts,
  RefreshTokens,
  Reminders,
  Scores,
  Settings,
  Subscriptions,
  Users,
  UsersRels,
  Wallets,
} from '../models';
import { AccountsRepository } from './accounts.repository';
import { BillListRepository } from './bill-list.repository';
import { BudgetsRepository } from './budgets.repository';
import { CategoriesRepository } from './categories.repository';
import { DongsRepository } from './dongs.repository';
import { GroupsRepository } from './groups.repository';
import { JointAccountSubscribesRepository } from './joint-account-subscribes.repository';
import { JointAccountsRepository } from './joint-accounts.repository';
import { MessagesRepository } from './messages.repository';
import { NotificationsRepository } from './notifications.repository';
import { PayerListRepository } from './payer-list.repository';
import { PurchasesRepository } from './purchases.repository';
import { ReceiptsRepository } from './receipts.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { RemindersRepository } from './reminders.repository';
import { ScoresRepository } from './scores.repository';
import { SettingsRepository } from './settings.repository';
import { SubscriptionsRepository } from './subscriptions.repository';
import { UsersRelsRepository } from './users-rels.repository';
import { WalletsRepository } from './wallets.repository';

export class UsersRepository extends DefaultCrudRepository<Users, typeof Users.prototype.userId> {
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

  public readonly reminders: HasManyRepositoryFactory<Reminders, typeof Users.prototype.userId>;

  public readonly receipts: HasManyRepositoryFactory<Receipts, typeof Users.prototype.userId>;

  public readonly wallets: HasManyRepositoryFactory<Wallets, typeof Users.prototype.userId>;

  public readonly accounts: HasManyRepositoryFactory<Accounts, typeof Users.prototype.userId>;

  public readonly groups: HasManyRepositoryFactory<Groups, typeof Users.prototype.userId>;

  public readonly groupParticipants: HasManyThroughRepositoryFactory<
    GroupParticipants,
    typeof GroupParticipants.prototype.groupParticipantId,
    Groups,
    typeof Users.prototype.userId
  >;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
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
    @repository.getter('RemindersRepository')
    protected remindersRepositoryGetter: Getter<RemindersRepository>,
    @repository.getter('ReceiptsRepository')
    protected receiptsRepositoryGetter: Getter<ReceiptsRepository>,
    @repository.getter('WalletsRepository')
    protected walletsRepositoryGetter: Getter<WalletsRepository>,
    @repository.getter('AccountsRepository')
    protected accountsRepositoryGetter: Getter<AccountsRepository>,
    @repository.getter('GroupsRepository')
    protected groupsRepositoryGetter: Getter<GroupsRepository>,
  ) {
    super(Users, dataSource);

    this.groups = this.createHasManyRepositoryFactoryFor('groups', groupsRepositoryGetter);
    this.registerInclusionResolver('groups', this.groups.inclusionResolver);

    this.accounts = this.createHasManyRepositoryFactoryFor('accounts', accountsRepositoryGetter);
    this.registerInclusionResolver('accounts', this.accounts.inclusionResolver);

    this.wallets = this.createHasManyRepositoryFactoryFor('wallets', walletsRepositoryGetter);
    this.registerInclusionResolver('wallets', this.wallets.inclusionResolver);

    this.receipts = this.createHasManyRepositoryFactoryFor('receipts', receiptsRepositoryGetter);
    this.registerInclusionResolver('receipts', this.receipts.inclusionResolver);

    this.reminders = this.createHasManyRepositoryFactoryFor('reminders', remindersRepositoryGetter);
    this.registerInclusionResolver('reminders', this.reminders.inclusionResolver);

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
  }
}
