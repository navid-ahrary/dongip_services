import {
  inject,
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import { Count, repository } from '@loopback/repository';
import { SecurityBindings, UserProfile, securityId } from '@loopback/security';
import { HttpErrors, Request, RestBindings } from '@loopback/rest';
import _ from 'lodash';
import { CategoriesRepository, UsersRepository } from '../repositories';
import { LocalizedMessages } from '../types';
import { LocMsgsBindings } from '../keys';
import { Categories } from '../models';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({ tags: { key: ValidateCategoryIdInterceptor.BINDING_KEY } })
export class ValidateCategoryIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateCategoryIdInterceptor.name}`;
  private readonly userId: number;

  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject(LocMsgsBindings) public locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @repository(UsersRepository) public usersRepo: UsersRepository,
    @repository(CategoriesRepository) public categoriesRepo: CategoriesRepository,
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
    let categoryId: typeof Categories.prototype.categoryId;
    let countCategory: Count;

    if (invocationCtx.methodName === 'createDongs') {
      categoryId = invocationCtx.args[0].categoryId;

      countCategory = await this.categoriesRepo.count({
        userId: this.userId,
        categoryId: categoryId,
      });
      // Validate categoryId
      if (countCategory.count !== 1) {
        const errMessage = this.locMsg['CATEGORY_NOT_VALID'][lang];
        throw new HttpErrors.UnprocessableEntity(errMessage);
      }
    } else if (
      invocationCtx.methodName === 'updateDongsById' &&
      _.has(invocationCtx.args[1], 'categoryId')
    ) {
      categoryId = invocationCtx.args[1].categoryId;
      countCategory = await this.categoriesRepo.count({
        userId: this.userId,
        categoryId: categoryId,
      });

      if (countCategory.count !== 1) {
        const errMsg = this.locMsg['CATEGORY_NOT_VALID'][lang];
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    } else if (
      [
        'deleteCategoriesById',
        'patchCategoriesById',
        'createCategoriesBudgets',
        'findCategoriesBudgets',
      ].includes(invocationCtx.methodName)
    ) {
      categoryId = invocationCtx.args[0];

      countCategory = await this.categoriesRepo.count({
        userId: this.userId,
        categoryId: categoryId,
      });

      if (countCategory.count !== 1) {
        const errMsg = this.locMsg['CATEGORY_NOT_VALID'][lang];
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    }

    const result = await next();
    // Add post-invocation logic here

    return result;
  }
}
