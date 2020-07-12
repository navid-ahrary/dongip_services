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
import {HttpErrors} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateCategoryIdInterceptor.BINDING_KEY}})
export class ValidateCategoryIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateCategoryIdInterceptor.name}`;
  userId: number;

  constructor(
    @repository(CategoriesRepository)
    public categoriesRepo: CategoriesRepository,
    @repository(UsersRepository) public usersRepo: UsersRepository,
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
    if (invocationCtx.methodName === 'createDongs') {
      const categoryId = invocationCtx.args[0].categoryId;

      const curretnUserFoundCategory = await this.categoriesRepo.findOne({
        where: {userId: this.userId, categoryId: categoryId},
      });
      // Validate categoryId
      if (!curretnUserFoundCategory) {
        throw new HttpErrors.UnprocessableEntity(
          'دسته بندی مورد نظر یافت نیست',
        );
      }
    } else if (
      invocationCtx.methodName === 'deleteCategoriesById' ||
      invocationCtx.methodName === 'patchCategoriesById'
    ) {
      const categoryId = invocationCtx.args[0];
      const foundCategory = await this.usersRepo
        .categories(this.userId)
        .find({where: {categoryId: categoryId}});
      if (foundCategory.length !== 1) {
        throw new HttpErrors.UnprocessableEntity(
          'دسته بندی مورد نظر یافت نیست',
        );
      }
    }
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
