import
{
  AuthenticationComponent,
  AuthenticationBindings,
  AuthenticateActionProvider,
  AuthenticationStrategyProvider,
  AuthMetadataProvider,
} from '@loopback/authentication'

export class UserAuthenticationComponent extends AuthenticationComponent
{
  constructor ()
  {
    super()
    this.providers = {
      [ AuthenticationBindings.AUTH_ACTION.key ]: AuthenticateActionProvider,
      [ AuthenticationBindings.STRATEGY.key ]: AuthenticationStrategyProvider,
      [ AuthenticationBindings.METADATA.key ]: AuthMetadataProvider,
    }
  }
}
