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
import {CategoryRepository} from '../repositories';
import {HttpErrors} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateCategoryIdInterceptor.BINDING_KEY}})
export class ValidateCategoryIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateCategoryIdInterceptor.name}`;

  constructor(
    @repository(CategoryRepository) public categoryRepo: CategoryRepository,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
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
      categoryId = invocationCtx.args[0].categoryId;

    if (invocationCtx.methodName === 'createDongs') {
      const curretnUserFoundCategory = await this.categoryRepo.findOne({
        where: {userId: userId, categoryId: categoryId},
      });
      // Validate categoryId
      if (!curretnUserFoundCategory) {
        throw new HttpErrors.NotFound('این دسته بندی موجود نیس!');
      }
    }

    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
