import {
  inject,
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { repository } from '@loopback/repository';
import { HttpErrors, Request, RestBindings } from '@loopback/rest';

import {
  BudgetsRepository,
  CategoriesRepository,
  GroupsRepository,
  UsersRelsRepository,
} from '../repositories';
import { Budgets } from '../models';
import { LocalizedMessages } from '../application';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({ tags: { key: ValidateBudgetIdInterceptor.BINDING_KEY } })
export class ValidateBudgetIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateBudgetIdInterceptor.name}`;
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(BudgetsRepository) public budgetsRepo: BudgetsRepository,
    @repository(CategoriesRepository)
    public categoriessRepo: CategoriesRepository,
    @repository(GroupsRepository) public groupsRepo: GroupsRepository,
    @repository(UsersRelsRepository) public usersRelsRepo: UsersRelsRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
  ) {
    this.userId = +this.currentUserProfile[securityId];
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
  async intercept(invocationCtx: InvocationContext, next: () => ValueOrPromise<InvocationResult>) {
    this.lang = this.req.headers['accept-language'] ?? 'fa';

    if (
      invocationCtx.methodName === 'updateBudgetsById' ||
      invocationCtx.methodName === 'deleteBudgetsById'
    ) {
      const budgetId = invocationCtx.args[0];

      const foundBudget = await this.budgetsRepo.findOne({
        where: { budgetId: budgetId, userId: this.userId },
      });

      if (!foundBudget) {
        throw new HttpErrors.UnprocessableEntity(this.locMsg['BUDGET_NOT_VALID'][this.lang]);
      }
    }

    if (invocationCtx.methodName === 'updateBudgetsById') {
      await this.validateBudgetReqBody(invocationCtx.args[1]);
    }

    if (invocationCtx.methodName === 'createBudgets') {
      await this.validateBudgetReqBody(invocationCtx.args[0]);
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }

  async validateBudgetReqBody(entity: Budgets): Promise<Budgets> {
    let errMsg = this.locMsg['BUDGET_SELECT_ITEM'][this.lang];

    if (entity.categoryId && entity.categoryId > 0) {
      if (entity.userRelId !== 0 || entity.jointAccountId !== 0) {
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }

      const foundCategory = await this.categoriessRepo.findOne({
        where: { userId: this.userId, categoryId: entity.categoryId },
      });
      if (!foundCategory) {
        errMsg = this.locMsg['GROUP_NOT_VALID'][this.lang];
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }

      entity.jointAccountId = undefined;
      entity.userRelId = undefined;
    } else if (entity.userRelId && entity.userRelId > 0) {
      if (entity.categoryId !== 0 || entity.jointAccountId !== 0) {
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }

      const foundUserRel = await this.usersRelsRepo.findOne({
        where: { userId: this.userId, userRelId: entity.userRelId },
      });
      if (!foundUserRel) {
        errMsg = this.locMsg['USER_REL_NOT_VALID'][this.lang];
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }

      entity.categoryId = undefined;
      entity.jointAccountId = undefined;
    } else if (entity.jointAccountId && entity.jointAccountId > 0) {
      if (entity.userRelId !== 0 || entity.categoryId !== 0) {
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }

      const foundأGroup = await this.groupsRepo.findOne({
        where: { userId: this.userId, groupId: entity.jointAccountId },
      });
      if (!foundأGroup) {
        errMsg = this.locMsg['GROUP_NOT_VALID'][this.lang];
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }

      entity.categoryId = undefined;
      entity.userRelId = undefined;
    } else {
      entity.jointAccountId = undefined;
      entity.userRelId = undefined;
      entity.categoryId = undefined;
    }

    return entity;
  }
}
