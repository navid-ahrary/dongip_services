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
      [securityId]: _.get(authorizationCtx.principals[0], 'id'),
      roles: _.get(authorizationCtx.principals[0], 'roles'),
    };
  } else return AuthorizationDecision.DENY;

  if (!currentUser.roles) return AuthorizationDecision.DENY;

  // Authorize everything that does not have a allowedRoles property
  if (!metadata.allowedRoles && !metadata.deniedRoles) return AuthorizationDecision.ALLOW;

  let roleIsAllowed = false;
  for (const role of currentUser.roles) {
    if (_.includes(metadata.allowedRoles, role)) {
      roleIsAllowed = true;
      break;
    }
  }

  if (!roleIsAllowed) return AuthorizationDecision.DENY;

  // Admin and costumer accounts bypass id verification
  if (
    _.includes(currentUser.roles, 'GOD') ||
    _.includes(currentUser.roles, 'GOLD') ||
    _.includes(currentUser.roles, 'BRONZE')
  ) {
    return AuthorizationDecision.ALLOW;
  }

  // Allow access only to model owners
  if (currentUser[securityId] === authorizationCtx.invocationContext.args[0]) {
    return AuthorizationDecision.ALLOW;
  }

  return AuthorizationDecision.DENY;
}
