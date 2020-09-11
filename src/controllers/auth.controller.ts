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
import _ from 'lodash';

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
  ValidatePasswordInterceptor,
  ValidatePhoneEmailInterceptor,
} from '../interceptors';
import {MailerService} from '../services/mailer.service';

@model()
export class NewUser extends Users {
  @property({type: 'string', required: true, length: 9}) password: string;

  @property({
    type: 'string',
    default: 'fa',
    jsonSchema: {
      minLength: 2,
      maxLength: 2,
      description: 'ISO 639-1',
    },
  })
  language?: string;

  @property({
    type: 'string',
    default: 'IRR',
    jsonSchema: {
      minLength: 3,
      maxLength: 3,
      description: 'ISO 4217',
    },
  })
  currency?: string;
}
@api({basePath: '/auth', paths: {}})
@intercept(
  ValidatePhoneEmailInterceptor.BINDING_KEY,
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
    @service(MailerService) protected mailerService: MailerService,
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
    summary: 'Verify phone/email for login/signup',
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
                verifyToken: {type: 'string'},
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
      description: 'Verify phone number or email address',
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
              'emailMessageId',
              'emailStatusText',
              'kavenegarCost',
              'kavenegarDate',
              'kavenegarMessageId',
              'kavenegarSender',
              'kavenegarStatusCode',
              'kavenegarStatusText',
              'loggedIn',
              'loggedInAt',
            ],
            optional: ['smsSignature', 'phone', 'email'],
          }),
          examples: {
            phone: {
              value: {
                phone: '+989176502184',
                smsSignature: 'a2V5dG9vbCB',
              },
            },
            email: {
              value: {
                email: 'dongip.supp@gmail.com',
              },
            },
          },
        },
      },
    })
    verifyReqBody: Verify,
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

    if (
      (!_.has(verifyReqBody, 'phone') && !_.has(verifyReqBody, 'email')) ||
      (_.has(verifyReqBody, 'phone') && _.has(verifyReqBody, 'email'))
    ) {
      throw new HttpErrors.UnprocessableEntity(
        'Either Phone or email must be provided',
      );
    }

    const countRequstedVerifyCode = await this.verifyRepository.count({
      or: [{phone: verifyReqBody.phone}, {email: verifyReqBody.email}],
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
      where: {or: [{phone: verifyReqBody.phone}, {email: verifyReqBody.email}]},
      fields: {
        name: true,
        avatar: true,
      },
    });

    const createdVerify = await this.verifyRepository
      .create({
        phone: verifyReqBody.phone ? verifyReqBody.phone : undefined,
        email: verifyReqBody.email ? verifyReqBody.email : undefined,
        password: randomStr + randomCode,
        smsSignature: verifyReqBody.smsSignature
          ? verifyReqBody.smsSignature
          : ' ',
        registered: user ? true : false,
        createdAt: nowUTC.toISOString(),
        region: verifyReqBody.phone
          ? this.phoneNumberService.getRegionCodeISO(verifyReqBody.phone)
          : undefined,
        userAgent: this.ctx.request.headers['user-agent']
          ? this.ctx.request.headers['user-agent'].toString().toLowerCase()
          : undefined,
        platform: this.ctx.request.headers['platform']
          ? this.ctx.request.headers['platform'].toString().toLowerCase()
          : undefined,
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

    if (verifyReqBody.phone) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.smsService
        .sendSms(randomCode, verifyReqBody.phone, verifyReqBody.smsSignature)
        .then(async (res) => {
          await this.verifyRepository.updateById(createdVerify.getId(), {
            kavenegarMessageId: res.body.messageid,
            kavenegarDate: res.body.date,
            kavenegarSender: res.body.sender,
            kavenegarStatusText: res.body.statustext,
            kavenegarCost: res.body.cost,
            kavenegarStatusCode: res.statusCode,
          });
        })
        .catch(async (err) => {
          await this.verifyRepository.updateById(createdVerify.getId(), {
            kavenegarStatusCode: err.statusCode,
          });
          console.error(err.message);
        });
    } else if (verifyReqBody.email) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.mailerService
        .sendMail({
          subject: 'کد ورود به اپلیکیشن دُنگیپ',
          to: verifyReqBody.email,
          text: `کد ورود به اپلیکیشن دُنگیپ ${randomCode}`,
        })
        .then(async (res) => {
          await this.verifyRepository.updateById(createdVerify.getId(), {
            emailMessageId: res['messageId'],
            emailStatusText: res['response'],
          });
        });
    }

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
          examples: {
            phone: {
              value: {
                phone: '+989176502184',
                password: 'DNG123456',
              },
            },
            email: {
              value: {
                phone: 'dongip.supp@gmail.com',
                password: 'DNG123456',
              },
            },
          },
        },
      },
    })
    credentials: Credentials,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<{
    userId: typeof Users.prototype.userId;
    accessToken: string;
    refreshToken: string;
    totalScores: number;
  }> {
    if (
      (!_.has(credentials, 'phone') && !_.has(credentials, 'email')) ||
      (_.has(credentials, 'phone') && _.has(credentials, 'email'))
    ) {
      throw new HttpErrors.UnprocessableEntity(
        'Either Phone or email must be provided',
      );
    }

    const verifyId = +currentUserProfile[securityId];

    try {
      const foundVerify = await this.verifySerivce.verifyCredentials(
        verifyId,
        credentials.password,
      );

      // Ensure the user exists and the password is correct
      const user = await this.userService.verifyCredentials(credentials);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.updateById(user.getId(), {
        firebaseToken: firebaseToken,
        region: foundVerify.phone
          ? this.phoneNumberService.getRegionCodeISO(foundVerify.phone)
          : undefined,
        userAgent: this.ctx.request.headers['user-agent']
          ? this.ctx.request.headers['user-agent'].toString().toLowerCase()
          : undefined,
        platform: this.ctx.request.headers['platform']
          ? this.ctx.request.headers['platform'].toString().toLowerCase()
          : undefined,
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
              'email',
            ],
            optional: ['username', 'currency', 'language'],
          }),
          example: {
            phone: '+989171234567',
            name: 'Dongip',
            username: 'dongipapp',
            language: 'fa',
            currency: 'IRR',
            avatar: '/assets/avatar/avatar_1.png',
            password: 'DNG123456',
          },
        },
      },
    })
    newUser: NewUser,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
      nowUTC = moment.utc(),
      userLanguage = newUser.language,
      userCurrency = newUser.currency;

    const foundVerify = await this.verifySerivce.verifyCredentials(
      verifyId,
      credentials.password,
    );

    const countRegisteredUsers = await this.usersRepository.count();

    try {
      const userObject = new Users({
        avatar: newUser.avatar,
        phone: newUser.phone,
        name: newUser.name,
        region: foundVerify.region ? foundVerify.region : undefined,
        email: foundVerify.email ? foundVerify.email : undefined,
        roles: countRegisteredUsers.count < 1000 ? ['GOLD'] : ['BRONZE'],
        firebaseToken: firebaseToken ? firebaseToken : undefined,
        userAgent: this.ctx.request.headers['user-agent'],
        platform: this.ctx.request.headers['platform']
          ? this.ctx.request.headers['platform'].toString().toLowerCase()
          : undefined,
      });
      const savedUser = await this.usersRepository.create(userObject);

      const savedScore = await this.usersRepository
        .scores(savedUser.getId())
        .create({
          score: 50,
          createdAt: nowUTC.toISOString(),
        });

      // Convert user object to a UserProfile object (reduced set of properties)
      const userProfile = this.userService.convertToUserProfile(savedUser);
      userProfile['aud'] = 'access';

      const accessToken: string = await this.jwtService.generateToken(
        userProfile,
      );

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.usersRels(savedUser.getId()).create({
        type: 'self',
        avatar: savedUser.avatar,
        phone: newUser.phone,
        email: foundVerify.email ? foundVerify.email : undefined,
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.categoriesSourceRepository.find().then((initCatList) => {
        initCatList.forEach((cat) => {
          Object.assign(cat, {userId: savedUser.userId});
        });
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.categoriesRepository.createAll(initCatList);
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.settingsRepository.create({
        userId: savedUser.userId,
        language: userLanguage,
        currency: userCurrency,
      });

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
      if (
        err.errno === 1062 &&
        err.code === 'ER_DUP_ENTRY' &&
        err.sqlMessage.endsWith("'phone'")
      ) {
        throw new HttpErrors.Conflict(
          'این شماره موبایل قبلن ثبت نام شده است. اگر متعلق به شماست، از طریق گزینه «ورود با موبایل» به اپ وارد شوید',
        );
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
    const userId = +currentUserProfile[securityId];

    const user = await this.usersRepository.findById(userId);

    const isMatched = await this.passwordHasher.comparePassword(
      token.split(' ')[1],
      user.refreshToken,
    );

    if (!isMatched) {
      throw new HttpErrors.Unauthorized('Refresh tokens are not matched');
    }

    const userProfile = this.userService.convertToUserProfile(user);
    userProfile.aud = 'refresh';
    const accessToken = await this.jwtService.generateToken(userProfile);

    return {accessToken};
  }

  @get('/logout', {
    summary: 'Logout from app',
    description:
      "Blacklist access token and remove user's firebase token property",
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'No content',
      },
    },
  })
  @authenticate('jwt.access')
  logout(@inject(SecurityBindings.USER) currentUserProfile: UserProfile): void {
    const userId = +currentUserProfile[securityId];
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.blacklistRepository.create({
      token: this.ctx.request.headers['authorization']!.split(' ')[1],
    });
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.usersRepository.updateById(userId, {firebaseToken: undefined});
  }
}
