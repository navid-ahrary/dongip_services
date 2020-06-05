import {
  inject,
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import _ from 'underscore';
import {UsersRelsRepository} from '../repositories';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {PostNewDong} from '../models';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateUsersRelsIdsInterceptor.BINDING_KEY}})
export class ValidateUsersRelsIdsInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateUsersRelsIdsInterceptor.name}`;

  constructor(
    @inject(SecurityBindings.USER)
    private currentUserProfile: UserProfile,
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
  ) {}

  /**
   * This method is used by LoopBack context to produce an interceptor function
   * for the binding.
   *
   * @returns An interceptor function
   */
  value() {
    return this.intercept.bind(this);
  }

  /**
   * The logic to intercept an invocation
   * @param invocationCtx - Invocation context
   * @param next - A function to invoke next interceptor or the target method
   */
  async intercept(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    const userId = Number(this.currentUserProfile[securityId]),
      billList: typeof PostNewDong.prototype.billList =
        invocationCtx.args[0].billList,
      payerList: typeof PostNewDong.prototype.billList =
        invocationCtx.args[0].payerList,
      allUsersRelsIdList: {userRelId: number}[] = [];

    if (invocationCtx.methodName === 'createDongs') {
      payerList.forEach((item) => {
        if (
          _.findIndex(allUsersRelsIdList, {userRelId: item.userRelId}) === -1
        ) {
          allUsersRelsIdList.push({userRelId: item.userRelId});
        }
      });

      billList.forEach((item) => {
        if (
          _.findIndex(allUsersRelsIdList, {userRelId: item.userRelId}) === -1
        ) {
          allUsersRelsIdList.push({userRelId: item.userRelId});
        }
      });

      // Validate userRelIds in billList and payerList
      const currentUserFoundUsersRelsList = await this.usersRelsRepository.find(
        {where: {or: allUsersRelsIdList, and: [{userId: userId}]}},
      );
      if (currentUserFoundUsersRelsList.length !== allUsersRelsIdList.length) {
        throw new HttpErrors.NotFound('بعضی از دوستی ها معتبر نیستن!');
      }

      invocationCtx.args.push({
        currentUserFoundUsersRelsList: currentUserFoundUsersRelsList,
      });
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
