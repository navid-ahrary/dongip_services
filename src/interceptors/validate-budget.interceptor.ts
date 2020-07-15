import {
  inject,
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';

import {
  BudgetsRepository,
  CategoriesRepository,
  GroupsRepository,
  UsersRelsRepository,
} from '../repositories';
import {Budgets} from '../models';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateBudgetIdInterceptor.BINDING_KEY}})
export class ValidateBudgetIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateBudgetIdInterceptor.name}`;
  readonly userId: number;

  constructor(
    @repository(BudgetsRepository) public budgetsRepo: BudgetsRepository,
    @repository(CategoriesRepository)
    public categoriessRepo: CategoriesRepository,
    @repository(GroupsRepository) public groupsRepo: GroupsRepository,
    @repository(UsersRelsRepository) public usersRelsRepo: UsersRelsRepository,

    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {
    this.userId = Number(this.currentUserProfile[securityId]);
  }

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
    if (
      invocationCtx.methodName === 'updateBudgetsById' ||
      invocationCtx.methodName === 'deleteBudgetsById'
    ) {
      const budgetId = invocationCtx.args[0];

      const foundBudget = await this.budgetsRepo.findOne({
        where: {budgetId: budgetId, userId: this.userId},
      });

      if (!foundBudget) {
        throw new HttpErrors.UnprocessableEntity('آی دی بودجه بندی معتبر نیست');
      }
    }

    if (
      invocationCtx.methodName === 'updateBudgetsById' ||
      invocationCtx.methodName === 'createBudgets'
    ) {
      await this.validateBudgetReqBody(invocationCtx.args[1]);
    }
    const result = await next();
    // Add post-invocation logic here
    return result;
  }

  async validateBudgetReqBody(entity: Budgets): Promise<Budgets> {
    if (entity.categoryId && entity.categoryId > 0) {
      if (entity.userRelId !== 0 || entity.groupId !== 0) {
        throw new HttpErrors.UnprocessableEntity(
          'Values of groupId and userRelId must be zero',
        );
      }

      const foundCategory = await this.categoriessRepo.findOne({
        where: {userId: this.userId, categoryId: entity.categoryId},
      });
      if (!foundCategory) {
        throw new HttpErrors.UnprocessableEntity('آی دی دسته بندی معتبر نیست');
      }

      delete entity.groupId;
      delete entity.userRelId;
    } else if (entity.userRelId && entity.userRelId > 0) {
      if (entity.categoryId !== 0 || entity.groupId !== 0) {
        throw new HttpErrors.UnprocessableEntity(
          'Values of groupId and categoryId must be zero',
        );
      }

      const foundUserRel = await this.usersRelsRepo.findOne({
        where: {userId: this.userId, userRelId: entity.userRelId},
      });
      if (!foundUserRel) {
        throw new HttpErrors.UnprocessableEntity('آی دی دوستی معتبر نیست');
      }

      delete entity.categoryId;
      delete entity.groupId;
    } else if (entity.groupId && entity.groupId > 0) {
      if (entity.userRelId !== 0 || entity.categoryId !== 0) {
        throw new HttpErrors.UnprocessableEntity(
          'Values of categoryId and userRelId must be zero',
        );
      }

      const foundأGroup = await this.groupsRepo.findOne({
        where: {userId: this.userId, groupId: entity.groupId},
      });
      if (!foundأGroup) {
        throw new HttpErrors.UnprocessableEntity('آی دی گروه معتبر نیست');
      }

      delete entity.groupId;
      delete entity.userRelId;
    }

    return entity;
  }
}
