import {inject, service, intercept} from '@loopback/core';
import {repository, property, model} from '@loopback/repository';
import {
  post,
  requestBody,
  HttpErrors,
  get,
  param,
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

import moment from 'moment';

import {
  PasswordHasherBindings,
  UserServiceBindings,
  TokenServiceBindings,
} from '../keys';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {Users, Credentials, Verify} from '../models';
import {
  UsersRepository,
  BlacklistRepository,
  VerifyRepository,
  CategoriesRepository,
  SettingsRepository,
  CategoriesSourceRepository,
} from '../repositories';
import {
  FirebaseService,
  SmsService,
  PasswordHasher,
  VerifyService,
  PhoneNumberService,
} from '../services';
import {
  ValidatePhoneNumInterceptor,
  ValidatePasswordInterceptor,
} from '../interceptors';

@model()
export class NewUser extends Users {
  @property({type: 'string', required: true, length: 9}) password: string;
}
@api({basePath: '/auth', paths: {}})
@intercept(
  ValidatePhoneNumInterceptor.BINDING_KEY,
  ValidatePasswordInterceptor.BINDING_KEY,
)
export class AuthController {
  constructor(
    @inject.context() public ctx: RequestContext,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BlacklistRepository)
    public blacklistRepository: BlacklistRepository,
    @repository(VerifyRepository) private verifyRepository: VerifyRepository,
    @repository(CategoriesSourceRepository)
    public categoriesSourceRepository: CategoriesSourceRepository,
    @repository(SettingsRepository)
    public settingsRepository: SettingsRepository,
    @repository(CategoriesRepository)
    public categoriesRepository: CategoriesRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<Users, Credentials>,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    private jwtService: TokenService,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @service(VerifyService) public verifySerivce: VerifyService,
    @service(SmsService) public smsService: SmsService,
    @service(PhoneNumberService) public phoneNumberService: PhoneNumberService,
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

  async getUserScores(userId: typeof Users.prototype.userId): Promise<number> {
    const scoresList = await this.usersRepository.scores(userId).find();
    let totalScores = 0;
    scoresList.forEach((scoreItem) => {
      totalScores += scoreItem.score;
    });
    return totalScores;
  }

  @post('/verify', {
    summary: 'Verify mobile number for login/signup',
    responses: {
      '200': {
        description: 'Registeration properties',
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
              'password',
              'createdAt',
              'registered',
              'loggedIn',
              'loggedInAt',
              'userAgent',
              'region',
              'platform',
            ],
            optional: ['smsSignature'],
          }),
          example: {
            phone: '+989176502184',
            smsSignature: 'a2V5dG9vbCB',
          },
        },
      },
    })
    verifyReqBody: Verify,
    @param.header.string('user-agent') userAgent: string,
  ): Promise<{
    status: boolean;
    name: string;
    avatar: string;
    prefix: string;
    verifyToken: string;
  }> {
    const nowUTC = moment.utc(),
      durationLimit = 5,
      randomCode = Math.random().toFixed(7).slice(3),
      randomStr = this.generateRandomString(3);

    const countRequstedVerifyCode = await this.verifyRepository.count({
      phone: verifyReqBody.phone,
      loggedIn: false,
      loggedInAt: undefined,
      createdAt: {
        between: [
          nowUTC.subtract(durationLimit, 'minutes').toISOString(),
          nowUTC.toISOString(),
        ],
      },
    });

    if (countRequstedVerifyCode.count > 5) {
      throw new HttpErrors.TooManyRequests(
        'تعداد در خواست هاینان بیش از حد مجاز است. ۵ دقیقه منتظر بمانید',
      );
    }

    const user = await this.usersRepository.findOne({
      where: {phone: verifyReqBody.phone},
      fields: {
        name: true,
        avatar: true,
      },
    });

    const createdVerify = await this.verifyRepository
      .create({
        phone: verifyReqBody.phone,
        password: randomStr + randomCode,
        smsSignature: verifyReqBody.smsSignature
          ? verifyReqBody.smsSignature
          : ' ',
        registered: user ? true : false,
        createdAt: nowUTC.toISOString(),
        region: this.phoneNumberService.getRegionCodeISO(verifyReqBody.phone),
        userAgent: userAgent,
        platform: userAgent === 'iPhone' ? 'ios' : 'and',
      })
      .catch((err) => {
        throw new HttpErrors.NotAcceptable(err.message);
      });

    // create userProfile
    const userProfile = {
      [securityId]: createdVerify.getId().toString(),
      aud: 'verify',
    };

    // Generate verify token
    const verifyToken: string = await this.jwtService.generateToken(
      userProfile,
    );

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.smsService
      .sendSms(randomCode, verifyReqBody.phone, verifyReqBody.smsSignature)
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.verifyRepository.updateById(createdVerify.getId(), {
          kavenegarMessageId: res.body.messageid,
          kavenegarDate: res.body.date,
          kavenegarSender: res.body.sender,
          kavenegarStatusText: res.body.statustext,
          kavenegarStatusCode: res.statusCode,
        });
      })
      .catch((err) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.verifyRepository.updateById(createdVerify.getId(), {
          kavenegarStatusCode: err.statusCode,
        });
        console.error(err.message);
      });

    return {
      status: user ? true : false,
      avatar: user ? user.avatar : 'dongip',
      name: user ? user.name : 'noob',
      prefix: randomStr,
      verifyToken: verifyToken,
    };
  }

  @post('/login', {
    summary: 'Login to app',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Some Users Properties',
        content: {
          'application/josn': {
            schema: getModelSchemaRef(Credentials),
            example: {
              userId: 1,
              score: 260,
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
    @param.header.string('user-agent') userAgent: string,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<{
    userId: typeof Users.prototype.userId;
    accessToken: string;
    refreshToken: string;
    totalScores: number;
  }> {
    const verifyId = Number(currentUserProfile[securityId]);

    try {
      const foundVerify = await this.verifySerivce.verifyCredentials(
        verifyId,
        credentials.password,
      );

      // Ensure the user exists and the password is correct
      const user = await this.userService.verifyCredentials(credentials);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.updateById(user.getId(), {
        firebaseToken: String(firebaseToken),
        userAgent: userAgent,
        region: this.phoneNumberService.getRegionCodeISO(foundVerify.phone),
        platform: userAgent === 'iPhone' ? 'ios' : 'and',
      });

      // Get total user's scores
      const scores = await this.getUserScores(user.getId());
      //convert a User object to a UserProfile object (reduced set of properties)
      const userProfile = this.userService.convertToUserProfile(user);
      userProfile['aud'] = 'access';

      //create a JWT token based on the Userprofile
      const accessToken = await this.jwtService.generateToken(userProfile);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.verifyRepository.updateById(verifyId, {
        loggedIn: true,
        loggedInAt: moment.utc().toISOString(),
      });

      return {
        userId: user.getId(),
        accessToken: accessToken,
        refreshToken: user.refreshToken,
        totalScores: scores,
      };
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }
  }

  @post('/signup', {
    summary: 'Signup then login to the app',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Some user's properties",
        content: {
          'application/json': {
            schema: getModelSchemaRef(Users, {
              exclude: [
                'userAgent',
                'roles',
                'phone',
                'name',
                'registeredAt',
                'virtualUsers',
                'userAgent',
                'firebaseToken',
                'avatar',
                'region',
                'platform',
              ],
            }),
            example: {
              id: 7,
              totalScores: 50,
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
              'roles',
              'categories',
              'dongs',
              'userAgent',
              'refreshToken',
              'firebaseToken',
              'registeredAt',
              'usersRels',
              'virtualUsers',
              'region',
              'platform',
            ],
            optional: ['username'],
          }),
          example: {
            phone: '+989176502184',
            name: 'Navid',
            username: 'navid71',
            avatar: '/assets/avatar/avatar_1.png',
            password: 'DNG123456',
          },
        },
      },
    })
    newUser: NewUser,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.header.string('user-agent') userAgent: string,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<{
    userId: typeof Users.prototype.userId;
    accessToken: string;
    refreshToken: string;
    totalScores: number;
  }> {
    const verifyId = Number(currentUserProfile[securityId]),
      credentials: Credentials = new Credentials({
        phone: newUser.phone,
        password: newUser.password,
      }),
      nowUTC = moment.utc();

    const foundVerify = await this.verifySerivce.verifyCredentials(
      verifyId,
      credentials.password,
    );

    newUser.region = foundVerify.region;

    const countRegisteredUsers = await this.usersRepository.count();
    if (countRegisteredUsers.count < 1000) {
      newUser.roles = ['GOLD'];
    }
    newUser.firebaseToken = String(firebaseToken);
    newUser.userAgent = userAgent;
    newUser.platform = userAgent === 'iPhone' ? 'ios' : 'and';

    delete newUser.password;

    try {
      // Create a new user
      const savedUser: Users = await this.usersRepository.create(newUser);

      const savedScore = await this.usersRepository
        .scores(savedUser.getId())
        .create({
          score: 50,
          createdAt: nowUTC.toISOString(),
          desc: 'signup',
        });

      // Convert user object to a UserProfile object (reduced set of properties)
      const userProfile: UserProfile = this.userService.convertToUserProfile(
        savedUser,
      );
      userProfile['aud'] = 'access';

      const accessToken: string = await this.jwtService.generateToken(
        userProfile,
      );

      await this.usersRepository.usersRels(savedUser.getId()).create({
        avatar: savedUser.avatar,
        type: 'self',
      });

      const initCatList = await this.categoriesSourceRepository.find();
      initCatList.forEach((cat) => {
        Object.assign(cat, {userId: savedUser.userId});
      });

      await Promise.all([
        this.categoriesRepository.createAll(initCatList),
        this.settingsRepository.create({userId: savedUser.userId}),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.verifyRepository.updateById(verifyId, {
        loggedIn: true,
        loggedInAt: nowUTC.toISOString(),
      });

      return {
        userId: savedUser.getId(),
        accessToken: accessToken,
        refreshToken: savedUser.refreshToken,
        totalScores: savedScore.score,
      };
    } catch (err) {
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

  @get('/access-token', {
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

  @get('/logout', {
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
  async logout(
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<void> {
    // Blacklist the access token
    await this.blacklistRepository
      .create({
        token: this.ctx.request.headers['authorization']!.split(' ')[1],
      })
      .catch((err) => {
        throw new HttpErrors.NotImplemented(`Error logout: ${err.message}`);
      });
  }
}
