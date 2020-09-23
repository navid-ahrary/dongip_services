import {
  inject,
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import {repository} from '@loopback/repository';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {CategoriesRepository, UsersRepository} from '../repositories';
import {HttpErrors, Request, RestBindings} from '@loopback/rest';
import {LocalizedMessages} from '../application';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateCategoryIdInterceptor.BINDING_KEY}})
export class ValidateCategoryIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateCategoryIdInterceptor.name}`;
  private readonly userId: number;
  lang: string;

  constructor(
    @repository(CategoriesRepository)
    public categoriesRepo: CategoriesRepository,
    @repository(UsersRepository) public usersRepo: UsersRepository,
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
  async intercept(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    this.lang = this.req.headers['accept-language']
      ? this.req.headers['accept-language']
      : 'fa';

    if (invocationCtx.methodName === 'createDongs') {
      const categoryId = invocationCtx.args[0].categoryId;

      const curretnUserFoundCategory = await this.categoriesRepo.findOne({
        where: {userId: this.userId, categoryId: categoryId},
      });
      // Validate categoryId
      if (!curretnUserFoundCategory) {
        const errMessage = this.locMsg['CATEGORY_NOT_VALID'][this.lang];
        throw new HttpErrors.UnprocessableEntity(errMessage);
      }
    } else if (
      invocationCtx.methodName === 'deleteCategoriesById' ||
      invocationCtx.methodName === 'patchCategoriesById' ||
      invocationCtx.methodName === 'createCategoriesBudgets' ||
      invocationCtx.methodName === 'findCategoriesBudgets'
    ) {
      const categoryId = invocationCtx.args[0];

      const foundCategory = await this.categoriesRepo.findOne({
        where: {categoryId: categoryId, userId: this.userId},
      });

      if (!foundCategory) {
        const errMsg = this.locMsg['CATEGORY_NOT_VALID'][this.lang];
        throw new HttpErrors.UnprocessableEntity(errMsg);
      }
    }
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
