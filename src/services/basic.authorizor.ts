import {
  AuthorizationContext,
  AuthorizationMetadata,
  AuthorizationDecision,
} from '@loopback/authorization';
import { UserProfile, securityId } from '@loopback/security';
import _ from 'lodash';

export async function basicAuthorization(
  authorizationCtx: AuthorizationContext,
  metadata: AuthorizationMetadata,
): Promise<AuthorizationDecision> {
  let currentUser: UserProfile;

  if (authorizationCtx.principals.length > 0) {
    currentUser = {
      [securityId]: authorizationCtx.principals[0].id,
      roles: authorizationCtx.principals[0].roles,
    };
  } else return AuthorizationDecision.DENY;

  if (!currentUser.roles) return AuthorizationDecision.DENY;

  // Authorize everything that does not have a allowedRoles property
  if (!metadata.allowedRoles?.length && !metadata.deniedRoles?.length) {
    return AuthorizationDecision.ALLOW;
  }

  let roleIsAllowed = false;

  for (const role of currentUser.roles) {
    if (_.includes(metadata.allowedRoles, role)) {
      roleIsAllowed = true;

      break;
    }
  }

  if (!roleIsAllowed) return AuthorizationDecision.DENY;

  return AuthorizationDecision.ALLOW;
}
