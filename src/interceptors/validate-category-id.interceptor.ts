import {
  bind,
  inject,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import { repository } from '@loopback/repository';
import { HttpErrors, Request, RestBindings } from '@loopback/rest';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import _ from 'lodash';
import { LocMsgsBindings } from '../keys';
import { CategoriesRepository } from '../repositories';
import { LocalizedMessages } from '../types';

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
    @inject(LocMsgsBindings) private locMsg: LocalizedMessages,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @repository(CategoriesRepository) private categoriesRepo: CategoriesRepository,
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
    const errMsg = this.locMsg['CATEGORY_NOT_VALID'][lang];

    if (invocationCtx.methodName === 'createDongs') {
      const categoryId = invocationCtx.args[0].categoryId;

      const countCategory = await this.categoriesRepo.count({
        userId: this.userId,
        categoryId: categoryId,
      });
      // Validate categoryId
      if (countCategory.count !== 1) {
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    }

    if (invocationCtx.methodName === 'updateDongsById' && invocationCtx.args[1].categoryId) {
      const categoryId = invocationCtx.args[1].categoryId;

      const countCategory = await this.categoriesRepo.count({
        userId: this.userId,
        categoryId: categoryId,
      });

      if (countCategory.count !== 1) {
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    }

    if (['createCategoriesBudgets', 'findCategoriesBudgets'].includes(invocationCtx.methodName)) {
      const categoryId = invocationCtx.args[0];

      const countCategory = await this.categoriesRepo.count({
        userId: this.userId,
        categoryId: categoryId,
      });

      if (countCategory.count !== 1) {
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    }

    if (
      invocationCtx.methodName === 'createCategories' ||
      invocationCtx.methodName === 'patchCategoriesById'
    ) {
      if (invocationCtx.args[0].parentCategoryId) {
        const categoryId = invocationCtx.args[0].parentCategoryId;

        const countCategory = await this.categoriesRepo.count({
          userId: this.userId,
          categoryId: categoryId,
        });

        if (countCategory.count !== 1) {
          throw new HttpErrors.UnprocessableEntity(errMsg);
        }
      }
    }

    const result = await next();
    // Add post-invocation logic here

    return result;
  }
}
