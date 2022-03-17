import {
  bind,
  inject,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import { repository } from '@loopback/repository';
import { HttpErrors, Request, RestBindings } from '@loopback/rest';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import _ from 'lodash';
import { LocMsgsBindings } from '../keys';
import { Budgets } from '../models';
import {
  BudgetsRepository,
  CategoriesRepository,
  JointAccountsRepository,
  UsersRelsRepository,
} from '../repositories';
import { LocalizedMessages } from '../types';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({ tags: { key: ValidateBudgetIdInterceptor.BINDING_KEY } })
export class ValidateBudgetIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateBudgetIdInterceptor.name}`;
  private readonly userId: number;

  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @repository(BudgetsRepository) public budgetsRepo: BudgetsRepository,
    @repository(UsersRelsRepository) public usersRelsRepo: UsersRelsRepository,
    @repository(CategoriesRepository) public categoriessRepo: CategoriesRepository,
    @repository(JointAccountsRepository) public joitAccRepo: JointAccountsRepository,
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
    const lang = _.includes(this.req.headers['accept-language'], 'en') ? 'en' : 'fa';

    if (
      invocationCtx.methodName === 'updateBudgetsById' ||
      invocationCtx.methodName === 'deleteBudgetsById'
    ) {
      const budgetId = invocationCtx.args[0];

      const foundBudget = await this.budgetsRepo.findOne({
        where: { budgetId: budgetId, userId: this.userId },
      });

      if (!foundBudget) {
        const errMsg = this.locMsg['BUDGET_NOT_VALID'][lang];
        this.logger.log('error', errMsg);
        throw new HttpErrors.UnprocessableEntity(this.locMsg['BUDGET_NOT_VALID'][lang]);
      }
    }

    if (invocationCtx.methodName === 'updateBudgetsById') {
      try {
        await this.validateBudgetReqBody(invocationCtx.args[1]);
      } catch (err) {
        const errMsg = this.locMsg[err.message][lang];
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    }

    if (invocationCtx.methodName === 'createBudgets') {
      try {
        await this.validateBudgetReqBody(invocationCtx.args[0]);
      } catch (err) {
        const errMsg = this.locMsg[err.message][lang];
        this.logger.log('error', errMsg);
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }

  async validateBudgetReqBody(entity: Budgets): Promise<Budgets> {
    if (entity.categoryId && entity.categoryId > 0) {
      if (entity.userRelId !== 0 || entity.jointAccountId !== 0) {
        throw new Error('BUDGET_SELECT_ITEM');
      }

      const foundCategory = await this.categoriessRepo.findOne({
        where: { userId: this.userId, categoryId: entity.categoryId },
      });

      if (!foundCategory) {
        throw new Error('CATEGORY_NOT_VALID');
      }

      entity.jointAccountId = undefined;
      entity.userRelId = undefined;
    } else if (entity.userRelId && entity.userRelId > 0) {
      if (entity.categoryId !== 0 || entity.jointAccountId !== 0) {
        throw new Error('BUDGET_SELECT_ITEM');
      }

      const foundUserRel = await this.usersRelsRepo.findOne({
        where: { userId: this.userId, userRelId: entity.userRelId },
      });
      if (!foundUserRel) {
        throw new Error('USER_REL_NOT_VALID');
      }

      entity.categoryId = undefined;
      entity.jointAccountId = undefined;
    } else if (entity.jointAccountId && entity.jointAccountId > 0) {
      if (entity.userRelId !== 0 || entity.categoryId !== 0) {
        throw new Error('BUDGET_SELECT_ITEM');
      }

      const JA = await this.joitAccRepo.findOne({
        where: { jointAccountId: entity.jointAccountId },
        include: [
          {
            relation: 'jointAccountSubscribes',
            scope: {
              where: {
                userId: this.userId,
              },
            },
          },
        ],
      });
      if (!JA?.jointAccountSubscribes) {
        throw new Error('JOINT_NOT_VALID');
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
