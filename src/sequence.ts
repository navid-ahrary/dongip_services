import {
  AuthenticateFn,
  AuthenticationBindings,
  AUTHENTICATION_STRATEGY_NOT_FOUND,
  USER_PROFILE_NOT_FOUND,
} from '@loopback/authentication';
import { inject } from '@loopback/context';
import { ExpressRequestHandler, InvokeMiddleware } from '@loopback/express';
import {
  FindRoute,
  InvokeMethod,
  ParseParams,
  Reject,
  RequestContext,
  RestBindings,
  Send,
  SequenceHandler,
} from '@loopback/rest';
import helmet from 'helmet'; // For security
import morgan from 'morgan'; // For http access logging

const SequenceActions = RestBindings.SequenceActions;

const middlewareList: ExpressRequestHandler[] = [
  // Options fixed and can not be changed a runtime
  helmet({ contentSecurityPolicy: false }),
  morgan('combined', { immediate: true }),
];

export class MyAuthenticationSequence implements SequenceHandler {
  /**
   * Constructor: Injects findRoute, invokeMethod & logError
   * methods as promises.
   *
   * @param {FindRoute} findRoute Finds the appropriate controller method,
   *  spec and args for invocation (injected via SequenceActions.FIND_ROUTE).
   * @param {ParseParams} parseParams The parameter parsing function (injected
   * via SequenceActions.PARSE_PARAMS).
   * @param {InvokeMethod} invoke Invokes the method specified by the route
   * (injected via SequenceActions.INVOKE_METHOD).
   * @param {Send} send The action to merge the invoke result with the response
   * (injected via SequenceActions.SEND)
   * @param {Reject} reject The action to take if the invoke returns a rejected
   * promise result (injected via SequenceActions.REJECT).
   */

  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) public send: Send,
    @inject(SequenceActions.REJECT) public reject: Reject,
    @inject(SequenceActions.INVOKE_MIDDLEWARE, { optional: true })
    public invokeMiddleware: InvokeMiddleware = () => true,
    @inject(AuthenticationBindings.AUTH_ACTION) protected authenticationRequest: AuthenticateFn,
  ) {}

  async handle(context: RequestContext) {
    try {
      const { request, response } = context;
      // `this.invokeMiddleware` is an injected function to invoke a list of
      // Express middleware handler functions
      await this.invokeMiddleware(context, middlewareList);
      response.header('Access-Control-Allow-Origin', '*');
      response.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
      );
      if (request.method === 'OPTIONS') {
        response.status(200);
        this.send(response, 'ok');
      } else {
        // end add this
        const route = this.findRoute(request);
        await this.authenticationRequest(request);
        const args = await this.parseParams(request, route);
        const result = await this.invoke(route, args);
        this.send(response, result);
      }
    } catch (err) {
      console.error(`${new Date()}: ${JSON.stringify(err)}`);

      if (err.code === AUTHENTICATION_STRATEGY_NOT_FOUND || err.code === USER_PROFILE_NOT_FOUND) {
        Object.assign(err, { statusCode: 401 /* Unauthorized */ });
      }

      this.reject(context, err);
      return;
    }
  }
}
