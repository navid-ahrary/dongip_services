import {injectable, BindingScope, service} from '@loopback/core';
import {repository} from '@loopback/repository';

import {JointAccounts, Transaction, Users} from '../models';
import {
  JointAccountsRepository,
  JointAccountSubscribeRepository,
} from '../repositories';
import {FirebaseService} from './firebase.service';

@injectable({scope: BindingScope.TRANSIENT})
export class JointAccountService {
  constructor(
    @service(FirebaseService) public firebaserService: FirebaseService,
    @repository(JointAccountsRepository)
    public jointAccountRepo: JointAccountsRepository,
    @repository(JointAccountSubscribeRepository)
    public jointAccSubscribeRepo: JointAccountSubscribeRepository,
  ) {}

  async submit(
    userId: typeof Users.prototype.userId,
    jointAcountId: typeof JointAccounts.prototype.jointAccountId,
    tx: Transaction,
  ) {
    const JAS = await this.jointAccSubscribeRepo.find({
      fields: {jointSubscriberId: false},
      where: {jointAccountId: jointAcountId, userId: {neq: userId}},
      include: [
        {relation: 'user', scope: {fields: {userd: true, firebaseToken: true}}},
      ],
    });
  }
}
