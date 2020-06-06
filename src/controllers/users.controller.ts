import {inject, service, intercept} from '@loopback/core';
import {
  repository,
  property,
  model,
  IsolationLevel,
  Transaction,
} from '@loopback/repository';
import {
  post,
  requestBody,
  HttpErrors,
  get,
  param,
  patch,
  RequestContext,
  api,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  authenticate,
  UserService,
  TokenService,
} from '@loopback/authentication';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';

import {
  PasswordHasherBindings,
  UserServiceBindings,
  TokenServiceBindings,
} from '../keys';
import {UserPatchRequestBody} from './specs';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {Users, Credentials, Verify} from '../models';
import {
  UsersRepository,
  BlacklistRepository,
  VerifyRepository,
  UsersRelsRepository,
} from '../repositories';
import {
  FirebaseService,
  SmsService,
  PasswordHasher,
  TimeService,
  VerifyService,
} from '../services';
import {ValidatePhoneNumInterceptor} from '../interceptors';

@model()
export class NewUser extends Users {
  @property({
    type: 'string',
    required: true,
  })
  password: string;
}
@api({
  basePath: '/api/',
  paths: {},
})
@intercept(ValidatePhoneNumInterceptor.BINDING_KEY)
export class UsersController {
  constructor(
    @inject.context() public ctx: RequestContext,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @repository(BlacklistRepository)
    public blacklistRepository: BlacklistRepository,
    @repository(VerifyRepository) private verifyRepository: VerifyRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<Users, Credentials>,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @service(VerifyService) public verifySerivce: VerifyService,
    @service(SmsService) public smsService: SmsService,
    @service(TimeService) public timeService: TimeService,
  ) {}

  generateRandomString(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      charactersLength = characters.length;
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  @post('/users/verify', {
    summary: 'Verify mobile number for login/signup',
    responses: {
      '200': {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {type: 'boolean'},
                name: {type: 'string'},
                avatar: {type: 'string'},
                prefix: {type: 'string'},
              },
            },
          },
        },
      },
    },
  })
  @authenticate.skip()
  async verify(
    @requestBody({
      description: 'Verify phone number',
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(Verify, {
            exclude: [
              'verifyId',
              'userAgent',
              'password',
              'issuedAt',
              'registered',
            ],
          }),
          example: {
            phone: '+989176502184',
            firebaseToken: 'string',
          },
        },
      },
    })
    verifyReqBody: Verify,
    @param.header.string('user-agent', {
      required: true,
      example: 'Android29/Google_Pixel_4',
    })
    userAgent: string,
  ): Promise<{
    status: boolean;
    name: string;
    avatar: string;
    prefix: string;
    verifyToken: string;
    code: string;
  }> {
    const randomCode = Math.random().toFixed(7).slice(3),
      randomStr = this.generateRandomString(3);

    const user = await this.usersRepository.findOne({
      where: {phone: verifyReqBody.phone},
      fields: {
        name: true,
        avatar: true,
      },
    });

    // Hash the generated password
    const hashedPass = await this.passwordHasher.hashPassword(
      randomStr + randomCode,
    );

    const createdVerify = await this.verifyRepository
      .create({
        phone: verifyReqBody.phone,
        password: hashedPass,
        registered: user ? true : false,
        firebaseToken: verifyReqBody.firebaseToken,
        userAgent: userAgent,
        issuedAt: new Date(),
      })
      .catch((err) => {
        throw new HttpErrors.NotAcceptable(err.message);
      });

    // create userProfile
    const userProfile = {
      [securityId]: String(createdVerify.getId()),
      aud: 'verify',
    };

    // Generate verify token
    const token: string = await this.jwtService.generateToken(userProfile);

    // Send verify token via notification
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.firebaseService.sendToDeviceMessage(verifyReqBody.firebaseToken, {
      data: {verifyToken: token},
    });

    // send verify code via sms
    this.smsService.sendSms('dongip', randomCode, verifyReqBody.phone);

    return {
      status: user ? true : false,
      avatar: user ? user.avatar : 'dongip',
      name: user ? user.name : 'noob',
      prefix: randomStr,
      code: randomCode,
      verifyToken: token,
    };
  }

  @post('/users/login', {
    summary: 'Login to the app',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Some Users Properties',
        content: {
          'application/josn': {
            schema: getModelSchemaRef(Credentials),
            example: {
              userId: 1,
              accessToken: 'string',
              refreshToken: 'string',
            },
          },
        },
      },
    },
  })
  @authenticate('jwt.verify')
  async login(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Credentials),
          example: {
            phone: '+989176502184',
            password: 'DNG123456',
          },
        },
      },
    })
    credentials: Credentials,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<{
    userId: typeof Users.prototype.userId;
    accessToken: string;
    refreshToken: string;
  }> {
    const verifyId = Number(currentUserProfile[securityId]);

    // Add token to bliacklist
    await this.blacklistRepository.create({
      token: this.ctx.request.headers['authorization']!.split(' ')[1],
      createdAt: new Date(),
    });

    try {
      const verify = await this.verifySerivce.verifyCredentials(
        verifyId,
        credentials.password,
      );

      // Ensure the user exists and the password is correct
      const user = await this.userService.verifyCredentials(credentials);

      await this.usersRepository.updateById(user.getId(), {
        userAgent: verify.userAgent,
        firebaseToken: verify.firebaseToken,
      });
      //convert a User object to a UserProfile object (reduced set of properties)
      const userProfile = this.userService.convertToUserProfile(user);
      userProfile['aud'] = 'access';

      //create a JWT token based on the Userprofile
      const accessToken = await this.jwtService.generateToken(userProfile);

      return {
        userId: user.getId(),
        accessToken: accessToken,
        refreshToken: user.refreshToken,
      };
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.Unauthorized(_err.message);
    }
  }

  @post('/users/signup', {
    summary: 'Signup then login to the app',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        content: {
          'application/json': {
            schema: getModelSchemaRef(Users, {
              exclude: [
                'userAgent',
                'accountType',
                'phone',
                'name',
                'registeredAt',
                'virtualUsers',
                'userAgent',
                'firebaseToken',
                'avatar',
              ],
            }),
            example: {
              id: 7,
              accessToken: 'string',
              refreshToken: 'string',
            },
          },
        },
      },
    },
  })
  @authenticate('jwt.verify')
  async signup(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewUser, {
            title: 'NewUser',
            exclude: [
              'userId',
              'accountType',
              'categories',
              'dongs',
              'userAgent',
              'refreshToken',
              'firebaseToken',
              'registeredAt',
              'usersRels',
              'virtualUsers',
            ],
          }),
          example: {
            phone: '+989176502184',
            name: 'Navid',
            avatar: '/assets/avatar/avatar_1.png',
            password: 'DNG123456',
          },
        },
      },
    })
    newUser: NewUser,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<{
    userId: typeof Users.prototype.userId;
    accessToken: string;
    refreshToken: string;
  }> {
    const verifyId = Number(currentUserProfile[securityId]),
      credentials: Credentials = new Credentials({
        phone: newUser.phone,
        password: newUser.password,
      });

    // Add token to bliacklist
    await this.blacklistRepository.create({
      token: this.ctx.request.headers['authorization']!.split(' ')[1],
      createdAt: new Date(),
    });

    const verify = await this.verifySerivce.verifyCredentials(
      verifyId,
      credentials.password,
    );

    Object.assign(newUser, {
      registeredAt: new Date(),
      firebaseToken: verify.firebaseToken,
      userAgent: verify.userAgent,
    });
    delete newUser.password;

    // Begin trasactions
    const userRepoTx: Transaction = await this.usersRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );

    try {
      // Create a new user
      const savedUser: Users = await this.usersRepository.create(newUser, {
        transaction: userRepoTx,
      });

      // Convert user object to a UserProfile object (reduced set of properties)
      const userProfile: UserProfile = this.userService.convertToUserProfile(
        savedUser,
      );
      userProfile['aud'] = 'access';

      // Create a JWT token based on the Userprofile
      const accessToken: string = await this.jwtService.generateToken(
        userProfile,
      );

      // Create self-relation
      await this.usersRepository.usersRels(savedUser.getId()).create(
        {
          avatar: savedUser.avatar,
          type: 'self',
        },
        {transaction: userRepoTx},
      );

      // Commit transaction
      await userRepoTx.commit();

      return {
        userId: savedUser.getId(),
        accessToken: accessToken,
        refreshToken: savedUser.refreshToken,
      };
    } catch (err) {
      // rollback transaction
      await userRepoTx.rollback();

      // Duplicate phone number error handling
      // base on search in stackoverflow, throw a conflict[409] error code
      // see https://stackoverflow.com/questions/12658574/rest-api-design-post-to-create-with-duplicate-data-would-be-integrityerror-500
      if (err.errno === 1062 && err.code === 'ER_DUP_ENTRY') {
        throw new HttpErrors.Conflict(err.message);

        // Properties length are too long error handling
      } else if (err.errno === 1406 && err.code === 'ER_DATA_TOO_LONG') {
        throw new HttpErrors.NotAcceptable(err.message);
      } else {
        throw new HttpErrors.NotAcceptable(err.message);
      }
    }
  }

  @get('/users/logout', {
    summary: 'Logout from app',
    description: 'Logout from app and blacklist the current access token',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'No content',
      },
    },
  })
  @authenticate('jwt.access')
  async logout(): Promise<void> {
    // Blacklist the access token
    await this.blacklistRepository
      .create({
        token: this.ctx.request.headers['authorization']!.split(' ')[1],
        createdAt: new Date(),
      })
      .catch((err) => {
        throw new HttpErrors.NotImplemented(`Error logout: ${err.message}`);
      });
  }

  @patch('/users', {
    summary: 'Update some of user properties',
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
    @requestBody(UserPatchRequestBody) user: Omit<Users, '_key'>,
  ): Promise<void> {
    const userId = Number(currentUserProfile[securityId]);

    return this.usersRepository.updateById(userId, user).catch((err) => {
      throw new HttpErrors.NotAcceptable(err.message);
    });
  }

  @get('/users/refresh-token', {
    summary:
      'Get a new access token with provided refresh token - not implemented yet',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'New access token',
      },
    },
  })
  @authenticate('jwt.refresh')
  async refreshToken(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.header.string('Authorization') token: string,
  ) {
    const userId = Number(currentUserProfile[securityId]);

    const user: Users = await this.usersRepository.findById(userId);

    const isMatched: Boolean = await this.passwordHasher.comparePassword(
      token.split(' ')[1],
      user.refreshToken,
    );

    if (!isMatched) {
      throw new HttpErrors.Unauthorized('Refresh tokens are not matched');
    }

    // Convert user to user profile
    const userProfile = this.userService.convertToUserProfile(user);
    userProfile.aud = 'refresh';
    // Generate access token
    const accessToken = await this.jwtService.generateToken(userProfile);

    return {accessToken: accessToken};
  }
}
