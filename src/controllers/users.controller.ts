import {inject, intercept} from '@loopback/core';
import {repository} from '@loopback/repository';
import {requestBody, HttpErrors, get, patch, api, param} from '@loopback/rest';
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
@authenticate('jwt.access')
export class UsersController {
  private readonly userId: number;

  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(LinksRepository) public linkRepository: LinksRepository,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<Users, Credentials>,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(SecurityBindings.USER) private currentUserProfile: UserProfile,
  ) {
    this.userId = +this.currentUserProfile[securityId];
  }

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
                    category: {type: 'string'},
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async findUserRrops(): Promise<{
    name: string;
    roles: string[];
    language: string;
    currency: string;
    registeredAt: string;
    totalScores: number;
    externalLinks: object;
  }> {
    const scores = await this.getUserScores(this.userId);+

    const foundUser = await this.usersRepository.findById(this.userId, {
      fields: {
        userId: true,
        name: true,
        roles: true,
        registeredAt: true,
        userAgent: true,
        setting: true,
      },
      include: [
        {
          relation: 'setting',
          scope: {fields: {userId: true, language: true, currency: true}},
        },
      ],
    });

    const foundLinks = await this.linkRepository.find();

    const externalLinks: {[key: string]: string} = {};
    foundLinks.forEach((link) => {
      externalLinks[link.name] = link.url;
    });

    return {
      name: foundUser!.name,
      roles: foundUser!.roles,
      language: foundUser.setting.language,
      currency: foundUser.setting.currency,
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
  async updateById(
    @requestBody(UserPatchRequestBody) patchUserReqBody: Omit<Users, '_key'>,
  ): Promise<void> {
    if (patchUserReqBody.avatar) {
      await this.usersRepository
        .usersRels(this.userId)
        .patch({avatar: patchUserReqBody.avatar}, {type: 'self'});
    }

    return this.usersRepository
      .updateById(this.userId, patchUserReqBody)
      .catch((err) => {
        if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
          if (err.sqlMessage.endsWith("'users.username'")) {
            throw new HttpErrors.Conflict('username مورد نظر در دسترس نیست');
          }
        }
        throw new HttpErrors.NotAcceptable(err.message);
      });
  }

  @get('/users/available', {
    summary: 'Check username availablity',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {description: 'Username is available [No content]'},
      '409': {description: 'Username is taken'},
    },
  })
  async findUsername(
    @param.query.string('username', {required: true}) username: string,
  ): Promise<void> {
    const foundUsername = await this.usersRepository.count({
      userId: {neq: this.userId},
      username: username,
    });

    if (foundUsername.count) throw new HttpErrors.Conflict('در دسترس نیست');
  }
}
