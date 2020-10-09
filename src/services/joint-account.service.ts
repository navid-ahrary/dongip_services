import {injectable, BindingScope, service} from '@loopback/core';

import {BillList, JointAccounts, PayerList, Users} from '../models';
import {FirebaseService} from './firebase.service';

@injectable({scope: BindingScope.TRANSIENT})
export class JointAccountService {
  constructor(
    @service(FirebaseService) protected firebaserService: FirebaseService,
  ) {}

  async apply(
    userId: typeof Users.prototype.userId,
    jointAcountId: typeof JointAccounts.prototype.jointAccountId,
    transaction: BillList | PayerList,
  ) {}
}
