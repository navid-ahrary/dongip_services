import {
  /* inject, */
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import {repository} from '@loopback/repository';
import {
  CategoriesSourceRepository,
  CategoriesRepository,
  SettingsRepository,
} from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: InitUsersSignup.BINDING_KEY}})
export class InitUsersSignup implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${InitUsersSignup.name}`;

  constructor(
    @repository(CategoriesSourceRepository)
    public catsSrcRepo: CategoriesSourceRepository,
    @repository(SettingsRepository)
    public settingsRepo: SettingsRepository,
    @repository(CategoriesRepository) public catsRepo: CategoriesRepository,
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
    try {
      const result = await next();

      if (invocationCtx.methodName === 'signup') {
        const userId = result.userId,
          initCatList = await this.catsSrcRepo.find();

        // Add userId property to every Categories
        initCatList.forEach((cat) => {
          Object.assign(cat, {userId: userId});
        });
        await this.catsRepo.createAll(initCatList);

        await this.settingsRepo.create({userId: result.userId});

        return result;
      }
    } catch (err) {
      console.error(err);
    }
  }
}
