/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable require-atomic-updates */
import {inject, service} from '@loopback/core';
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
import {Users, Credentials, Blacklist, Verify} from '../models';
import {
  UsersRepository,
  BlacklistRepository,
  VerifyRepository,
  CategoryRepository,
  UsersRelsRepository,
} from '../repositories';
import {
  FirebaseService,
  SmsService,
  validatePhoneNumber,
  PasswordHasher,
  TimeService,
  VerifyService,
} from '../services';
import {CategorySourceRepository} from '../repositories/category-source.repository';

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
export class UsersController {
  constructor(
    @inject.context() public ctx: RequestContext,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(UsersRelsRepository)
    public usersRelsRepository: UsersRelsRepository,
    @repository(BlacklistRepository)
    public blacklistRepository: BlacklistRepository,
    @repository(VerifyRepository) private verifyRepo: VerifyRepository,
    @repository(CategoryRepository)
    private categoryRepository: CategoryRepository,
    @repository(CategorySourceRepository)
    private categorySourceRepository: CategorySourceRepository,
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
            exclude: ['id', 'agent', 'password', 'issuedAt', 'registered'],
          }),
          example: {
            phone: '+989176502184',
            firebaseToken:
              'fDSwbEUyS4ujAh-4_yKuhF:APA91bGHJ7IfpVf6xoZjrjXmvU4coGGOZErf' +
              'FooDhfySvObpyHelselcWEX4vCkkpbGWglTNFMMShQp3o8m277FkZJOoY4Z' +
              '2LX5m5I6eAWE8vdmCrmSo2fb8Wt4yYBrJ3tuijnx4kjgw',
          },
        },
      },
    })
    reqBody: Verify,
    @param.header.string('User-Agent') userAgent: string,
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

    try {
      validatePhoneNumber(reqBody.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.NotAcceptable(_err.message);
    }

    user = await this.usersRepository.findOne({
      where: {phone: reqBody.phone},
      fields: {
        name: true,
        avatar: true,
      },
    });
    if (user) {
      status = true;
    }

    createdVerify = await this.verifyRepo
      .create({
        phone: reqBody.phone,
        password: await this.passwordHasher.hashPassword(
          randomStr + randomCode,
        ),
        registered: status,
        firebaseToken: reqBody.firebaseToken,
        agent: userAgent,
        issuedAt: new Date(),
      })
      .catch((_err) => {
        console.log(_err);
        throw new HttpErrors.Conflict(_err.message);
      });

    // create userProfile
    userProfile = {
      [securityId]: String(createdVerify.id),
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
      this.firebaseService.sendToDeviceMessage(reqBody.firebaseToken, payload);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    // send verify code with sms
    this.smsService.sendSms('dongip', randomCode, reqBody.phone);

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
              accessToken:
                'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50VHl' +
                'wZSI6ImJyb256ZSIsImF1ZCI6ImFjY2VzcyIsImlhdCI6MTU5MDU' +
                'wODY1MCwiZXhwIjoxNjIyMDQ4NjUwLCJzdWIiOiIzIn0.bvVYm8E' +
                'QDkQksY8aPW2Q1yA6SVksPn-mzWJrzkeiZrzFmb4NS6mXAYf-jhp' +
                'HjiflGjYVUw-ziqWn1pcSfgti8w',
            },
            refreshToken:
              'eyDPuioiOiJFSDIKohjwuhIODOISHjdijhii.eySDJKHBslaswdr' +
              'wWPOIjisdjIOIDugDLKIJSbdhgvbKJHGVbhdjVGHJKVdKUJhvvjU' +
              'wODY1MCwiZXhwIjoxNjIyMDQ4NjUwLCJzdWIiOiIzIn0.bvVYm8E' +
              'QDkQksY8aPW2Q1yA6SVksPn-mzWJrzkeiZrzFmb4NS6mXAYf-jhp' +
              'HjiflGjYVUw-OIHFiuyguhHDkjGyyUGUDYguyludlpZXfgti8w',
          },
        },
      },
    },
  })
  @authenticate('jwt.verify')
  async login(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
      validatePhoneNumber(credentials.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    try {
      verify = await this.verifySerivce.verifyCredentials(
        verifyId,
        credentials.password,
      );

      //ensure the user exists and the password is correct
      user = await this.userService.verifyCredentials(credentials);

      this.usersRepository.updateById(user.getId(), {
        userAgent: verify.agent,
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
      // _key: user._key,
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
              accessToken:
                'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50VHlwZSI6ImJyb256ZSIsImF1ZCI6ImFjY2VzcyIsImlhdCI6MTU5MDU2MTgzNiwiZXhwIjoxNjIyMTAxODM2LCJzdWIiOiI3In0.VInwb04E-GrzZZ7_ostar8N9J8blHF9SOISKaH9ManXqOfZN4d9UNzpHiKeudWE-c1VG4HzCcYXhgK2aKbvoZg',
              refreshToken:
                'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50VHlwZSI6ImJyb256ZSIsImF1ZCI6ImFjY2VzcyIsImlhdCI6MTU5MDU2MTgzNiwiZXhwIjoxNjIyMTAxODM2LCJzdWIiOiI3In0.VInwb04E-GrzZZ7_ostar8N9J8blHF9SOISKaH9ManXqOfZN4d9UNzpHiKeudWE-c1VG4HzCcYXhgK2',
            },
          },
        },
      },
    },
  })
  @authenticate('jwt.verify')
  async signup(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewUser, {
            title: 'NewUser',
            exclude: [
              'id',
              'accountType',
              'categories',
              'categoryBills',
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
      categoryTx: Transaction,
      usersRelsTx: Transaction;

    try {
      validatePhoneNumber(credentials.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    verify = await this.verifySerivce.verifyCredentials(
      verifyId,
      credentials.password,
    );

    Object.assign(newUser, {
      registeredAt: new Date(),
      firebaseToken: verify.firebaseToken,
      userAgent: verify.agent,
    });
    delete newUser.password;

    // begin all trasactions
    userTx = await this.usersRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    categoryTx = await this.categoryRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );
    usersRelsTx = await this.usersRelsRepository.beginTransaction(
      IsolationLevel.READ_COMMITTED,
    );

    try {
      // Create a new user
      savedUser = await this.usersRepository.create(newUser);

      // Create self-relation
      await this.usersRelsRepository.create({
        belongsToUserId: savedUser.getId(),
        targetUserId: savedUser.getId(),
        name: savedUser.name,
        avatar: savedUser.avatar,
        type: 'self',
      });

      // Get init category list from database and assign to new user in category list
      const initCategoryList = await this.categorySourceRepository.find({});

      // Add belongsToUserId prop to all category
      initCategoryList.forEach((cat) => {
        cat = Object.assign(cat, {belongsToUserId: savedUser.getId()});
      });

      // Create and assign init category list to the user
      await this.categoryRepository.createAll(initCategoryList);
      // Convert user object to a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile(savedUser);
      userProfile['aud'] = 'access';

      // Create a JWT token based on the Userprofile
      accessToken = await this.jwtService.generateToken(userProfile);

      // Commit all transactions
      await userTx.commit();
      await categoryTx.commit();
      await usersRelsTx.commit();

      return {
        id: savedUser.getId(),
        accessToken: accessToken,
        refreshToken: savedUser.refreshToken,
      };
    } catch (_err) {
      // rollback all transactions
      await userTx.rollback();
      await categoryTx.rollback();
      await usersRelsTx.rollback();

      console.log(_err);
      if (_err.code === 409) {
        throw new HttpErrors.Conflict(_err.response.body.errorMessage);
      } else {
        throw new HttpErrors.NotAcceptable(_err);
      }
    }
  }

  @get('/users/logout', {
    summary:
      "Logout from app and put the current user's access token in blacklist ",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: "Logout current user's client",
      },
    },
  })
  @authenticate('jwt.access')
  async logout(
    @param.header.string('authorization') authorizationHeader: string,
  ): Promise<Blacklist> {
    return this.blacklistRepository
      .create({
        token: authorizationHeader.split(' ')[1],
        createdAt: new Date(),
      })
      .catch((_err) => {
        console.log(_err);
        if (_err.code === 409) {
          throw new HttpErrors.Conflict(_err.response.body.errorMessage);
        } else {
          throw new HttpErrors.MethodNotAllowed(
            `Error logout not implemented: ${_err.message}`,
          );
        }
      });
  }

  @patch('/users', {
    summary: 'Update some of user properties',
    description: 'Request body includes desired properties to update',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  })
  @authenticate('jwt.access')
  async updateById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody(UserPatchRequestBody) user: Omit<Users, '_key'>,
  ): Promise<void> {
    const userId = Number(currentUserProfile[securityId]);

    try {
      return await this.usersRepository.updateById(userId, user);
    } catch (err) {
      throw new HttpErrors.NotAcceptable(err.message);
    }
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
