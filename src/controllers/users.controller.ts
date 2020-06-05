/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable require-atomic-updates */
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
    let result = '',
      characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      charactersLength = characters.length;
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
    let status = false,
      avatar = 'dongip',
      name = 'noob',
      randomCode = Math.random().toFixed(7).slice(3),
      randomStr = this.generateRandomString(3),
      payload,
      token: string,
      user: Users | null,
      createdVerify: Verify,
      userProfile: UserProfile;

    user = await this.usersRepository.findOne({
      where: {phone: verifyReqBody.phone},
      fields: {
        name: true,
        avatar: true,
      },
    });
    if (user) {
      status = true;
    }

    createdVerify = await this.verifyRepository
      .create({
        phone: verifyReqBody.phone,
        password: await this.passwordHasher.hashPassword(
          randomStr + randomCode,
        ),
        registered: status,
        firebaseToken: verifyReqBody.firebaseToken,
        userAgent: userAgent,
        issuedAt: new Date(),
      })
      .catch((err) => {
        console.log(err);
        throw new HttpErrors.NotAcceptable(err.message);
      });

    // create userProfile
    userProfile = {
      [securityId]: String(createdVerify.getId()),
      aud: 'verify',
    };

    // Generate verify token based on user profile
    token = await this.jwtService.generateToken(userProfile);

    try {
      // send verify token and prefix by notification
      payload = {
        data: {
          verifyToken: token,
        },
      };
      this.firebaseService.sendToDeviceMessage(
        verifyReqBody.firebaseToken,
        payload,
      );
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    // send verify code with sms
    this.smsService.sendSms('dongip', randomCode, verifyReqBody.phone);

    return {
      status: status,
      avatar: avatar,
      name: name,
      ...user,
      prefix: randomStr,
      code: randomCode,
      verifyToken: token!,
    };
  }

  @post('/users/login', {
    summary: 'Login to the app',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Login user',
        content: {
          'application/josn': {
            schema: getModelSchemaRef(Credentials),
            example: {
              id: 1,
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
    id: string;
    accessToken: string;
    refreshToken: string;
  }> {
    let userProfile: UserProfile,
      user: Users,
      verify: Verify,
      accessToken: string,
      verifyId = Number(currentUserProfile[securityId]);

    try {
      verify = await this.verifySerivce.verifyCredentials(
        verifyId,
        credentials.password,
      );

      //ensure the user exists and the password is correct
      user = await this.userService.verifyCredentials(credentials);

      this.usersRepository.updateById(user.getId(), {
        userAgent: verify.userAgent,
        firebaseToken: verify.firebaseToken,
      });
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.Unauthorized(_err.message);
    }

    //convert a User object to a UserProfile object (reduced set of properties)
    userProfile = this.userService.convertToUserProfile(user);
    userProfile['aud'] = 'access';

    try {
      //create a JWT token based on the Userprofile
      accessToken = await this.jwtService.generateToken(userProfile);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.NotImplemented(_err.message);
    }

    return {
      id: user.getId(),
      accessToken: accessToken,
      refreshToken: user.refreshToken,
    };
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
    id: string;
    accessToken: string;
    refreshToken: string;
  }> {
    let savedUser: Users,
      verify: Verify,
      accessToken: string,
      userProfile: UserProfile,
      verifyId = Number(currentUserProfile[securityId]),
      credentials = Object.assign(new Credentials(), {
        phone: newUser.phone,
        password: newUser.password,
      }),
      userTx: Transaction,
      usersRelsTx: Transaction;

    verify = await this.verifySerivce.verifyCredentials(
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
    userTx = await this.usersRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    usersRelsTx = await this.usersRelsRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );

    try {
      // Create a new user
      savedUser = await this.usersRepository.create(newUser, {
        transaction: userTx,
      });

      // Convert user object to a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile(savedUser);
      userProfile['aud'] = 'access';

      // Create a JWT token based on the Userprofile
      accessToken = await this.jwtService.generateToken(userProfile);

      // Create self-relation
      await this.usersRelsRepository.create(
        {
          userId: savedUser.getId(),
          name: savedUser.name,
          avatar: savedUser.avatar,
          type: 'self',
        },
        {transaction: usersRelsTx},
      );

      // Commit all transactions
      await userTx.commit();
      await usersRelsTx.commit();

      return {
        id: savedUser.getId(),
        accessToken: accessToken,
        refreshToken: savedUser.refreshToken,
      };
    } catch (err) {
      // rollback all transactions
      await userTx.rollback();
      await usersRelsTx.rollback();

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
    // Nonsense error handling
    // for prevent 'Object is possibly undefined' error in line 552
    if (!this.ctx.request.headers['authorization']) {
      throw new HttpErrors.Unauthorized('Access token not provided');
    }
    // Blacklist the current access token
    await this.blacklistRepository
      .create({
        token: this.ctx.request.headers['authorization'].split(' ')[1],
        createdAt: new Date(),
      })
      .catch((err) => {
        throw new HttpErrors.MethodNotAllowed(`Error logout: ${err.message}`);
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
    let user: Users,
      userProfile: UserProfile,
      userId = Number(currentUserProfile[securityId]),
      accessToken: string,
      isMatched: boolean;

    user = await this.usersRepository.findById(userId);
    isMatched = await this.passwordHasher.comparePassword(
      token.split(' ')[1],
      user.refreshToken,
    );

    if (!isMatched) {
      throw new HttpErrors.Unauthorized('Refresh tokens are not matched');
    }

    userProfile = this.userService.convertToUserProfile(user);
    userProfile.aud = 'access';

    accessToken = await this.jwtService.generateToken(userProfile);

    return {accessToken: accessToken};
  }
}
