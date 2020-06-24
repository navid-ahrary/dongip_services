import {
  bind,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  inject,
} from '@loopback/core';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {TicketsRepository} from '../repositories';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@bind({tags: {key: ValidateTicketIdInterceptor.BINDING_KEY}})
export class ValidateTicketIdInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${ValidateTicketIdInterceptor.name}`;
  userId: number;

  constructor(
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @repository(TicketsRepository) protected ticketsRepo: TicketsRepository,
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
    if (invocationCtx.methodName === 'findTicketById') {
      const foundTicket = await this.ticketsRepo.findOne({
        where: {userId: this.userId, ticketId: invocationCtx.args[0]},
      });
      if (!foundTicket)
        throw new HttpErrors.UnprocessableEntity('ticketId پیدا نشد');
    }
    // Add pre-invocation logic here
    const result = await next();
    // Add post-invocation logic here
    return result;
  }
}
