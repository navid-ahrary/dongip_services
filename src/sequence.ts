import {inject} from '@loopback/context';
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

const SequenceActions = RestBindings.SequenceActions;

export class MySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) public send: Send,
    @inject(SequenceActions.REJECT) public reject: Reject,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      // console.log(request);
      const route = this.findRoute(request);
      const args = await this.parseParams(request, route);
      // console.log(`args: ${JSON.stringify(args)}`);
      const result = await this.invoke(route, args);
      // console.log(`result: ${JSON.stringify(result)}`);
      this.send(response, result);
    } catch (err) {
      this.reject(context, err);
    }
  }
}
