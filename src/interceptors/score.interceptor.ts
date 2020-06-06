import {
  /* inject, */
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  inject,
} from '@loopback/context';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {UsersRepository} from '../repositories';
import {repository} from '@loopback/repository';

@bind({tags: {key: ScoreInterceptor.BINDING_KEY}})
export class ScoreInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ScoreInterceptor.name}`;

  constructor(
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
    @repository(UsersRepository) private usersRepository: UsersRepository,
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
    // Add pre-invocation logic here
    const result = await next(),
      userId = Number(this.currentUserProfile[securityId]);

    if (invocationCtx.methodName === 'createDongs') {
      await this.usersRepository
        .scores(userId)
        .create({createdAt: result.createdAt, score: 10, desc: result.desc});
    }

    return result;
  }
}
