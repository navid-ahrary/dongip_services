import {inject, intercept} from '@loopback/core';
import {repository} from '@loopback/repository';
import {requestBody, HttpErrors, get, patch, api} from '@loopback/rest';
import {
  authenticate,
  UserService,
  TokenService,
} from '@loopback/authentication';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';

import {UserServiceBindings, TokenServiceBindings} from '../keys';
import {UserPatchRequestBody} from './specs';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {Users, Credentials} from '../models';
import {UsersRepository, LinksRepository} from '../repositories';
import {FirebasetokenInterceptor} from '../interceptors';

@api({basePath: '/', paths: {}})
export class UsersController {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(LinksRepository) public linkRepository: LinksRepository,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<Users, Credentials>,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
  ) {}

  async getUserScores(userId: typeof Users.prototype.userId): Promise<number> {
    const scoresList = await this.usersRepository.scores(userId).find();
    let totalScores = 0;
    scoresList.forEach((scoreItem) => {
      totalScores += scoreItem.score;
    });
    return totalScores;
  }

  @intercept(FirebasetokenInterceptor.BINDING_KEY)
  @get('/users/info', {
    summary: "Get User's info",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "User's props",
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {type: 'string'},
                roles: {type: 'array', items: {type: 'string'}},
                registeredAt: {type: 'string'},
                totalScores: {type: 'number'},
                externalLinks: {
                  type: 'object',
                  properties: {
                    userRel: {type: 'string'},
                    group: {type: 'string'},
                    budget: {type: 'string'},
                    addDong: {type: 'string'},
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @authenticate('jwt.access')
  async findUserRrops(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<{
    name: string;
    roles: string[];
    registeredAt: string;
    totalScores: number;
    externalLinks: object;
  }> {
    const userId = Number(currentUserProfile[securityId]);
    const scores = await this.getUserScores(userId);
    const foundUser = await this.usersRepository.findById(userId, {
      fields: {name: true, roles: true, registeredAt: true, userAgent: true},
    });

    const foundLinks = await this.linkRepository.find();
    const externalLinks: {[key: string]: string} = {};
    foundLinks.forEach((link) => {
      externalLinks[link.name] = link.url;
    });

    return {
      name: foundUser.name,
      roles: foundUser.roles,
      registeredAt: foundUser.registeredAt,
      totalScores: scores,
      externalLinks: externalLinks,
    };
  }

  @intercept(FirebasetokenInterceptor.BINDING_KEY)
  @patch('/users', {
    summary: "Update User's properties",
    description: 'Request body includes desired properties to update',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User PATCH success - No content',
      },
    },
  })
  @authenticate('jwt.access')
  async updateById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody(UserPatchRequestBody) patchUserReqBOdy: Omit<Users, '_key'>,
  ): Promise<void> {
    const userId = Number(currentUserProfile[securityId]);

    if (patchUserReqBOdy.avatar) {
      await this.usersRepository
        .usersRels(userId)
        .patch({avatar: patchUserReqBOdy.avatar}, {type: 'self'});
    }

    return this.usersRepository
      .updateById(userId, patchUserReqBOdy)
      .catch((err) => {
        throw new HttpErrors.NotAcceptable(err.message);
      });
  }
}
