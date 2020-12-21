import { inject, service, intercept } from '@loopback/core';
import { repository } from '@loopback/repository';
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
import { authenticate, UserService, TokenService } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC, TokenObject } from '@loopback/authentication-jwt';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';

import util from 'util';
import path from 'path';
import fs from 'fs';
import moment from 'moment';
import _ from 'lodash';

import { PasswordHasherBindings, UserServiceBindings, TokenServiceBindings } from '../keys';
import { Users, Credentials, Verify, NewUser, Categories } from '../models';
import {
  UsersRepository,
  BlacklistRepository,
  VerifyRepository,
  CategoriesRepository,
  SettingsRepository,
} from '../repositories';
import {
  FirebaseService,
  SmsService,
  PasswordHasher,
  VerifyService,
  PhoneNumberService,
  EmailService,
  RefreshtokenService,
} from '../services';
import { ValidatePasswordInterceptor, ValidatePhoneEmailInterceptor } from '../interceptors';
import { LocalizedMessages, CategoriesSource } from '../application';

@api({
  basePath: '/auth',
  paths: {},
  components: {
    // headers: { 'accept-language': { required: false, schema: { type: 'string', default: 'fa' } } },
  },
})
@intercept(ValidatePhoneEmailInterceptor.BINDING_KEY, ValidatePasswordInterceptor.BINDING_KEY)
export class AuthController {
  lang: string;

  constructor(
    @inject.context() public ctx: RequestContext,
    @service(SmsService) public smsService: SmsService,
    @service(VerifyService) public verifySerivce: VerifyService,
    @service(EmailService) protected emailService: EmailService,
    @service(FirebaseService) public firebaseService: FirebaseService,
    @inject('application.localizedMessages') public locMsg: LocalizedMessages,
    @inject('application.categoriesSourceList') public catSrc: CategoriesSource,
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BlacklistRepository) public blacklistRepository: BlacklistRepository,
    @repository(VerifyRepository) private verifyRepository: VerifyRepository,
    @repository(SettingsRepository) public settingsRepository: SettingsRepository,
    @repository(CategoriesRepository) public categoriesRepository: CategoriesRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER) public passwordHasher: PasswordHasher,
    @inject(UserServiceBindings.USER_SERVICE) public userService: UserService<Users, Credentials>,
    @service(PhoneNumberService) public phoneNumberService: PhoneNumberService,
    @inject(TokenServiceBindings.TOKEN_SERVICE) private jwtService: TokenService,
    @service(RefreshtokenService) private refreshTokenService: RefreshtokenService,
  ) {
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

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
                status: { type: 'boolean' },
                isCompleted: { type: 'boolean' },
                name: { type: 'string' },
                avatar: { type: 'string' },
                prefix: { type: 'string' },
                verifyToken: { type: 'string' },
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
                phone: '+989171234567',
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
    @param.header.string('accept-language', { required: false }) langHeader: string,
  ): Promise<{
    status: boolean;
    isCompleted: boolean;
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
      throw new HttpErrors.UnprocessableEntity('Either Phone or email must be provided');
    }

    const countRequstedVerifyCode = await this.verifyRepository.count({
      or: [{ phone: verifyReqBody.phone }, { email: verifyReqBody.email }],
      loggedIn: false,
      loggedInAt: undefined,
      createdAt: {
        between: [nowUTC.subtract(durationLimit, 'minutes').toISOString(), nowUTC.toISOString()],
      },
    });

    if (countRequstedVerifyCode.count > 5) {
      throw new HttpErrors.TooManyRequests(this.locMsg['TOO_MANY_REQUEST'][this.lang]);
    }

    const user = await this.usersRepository.findOne({
      fields: { name: true, avatar: true, phone: true },
      where: { or: [{ phone: verifyReqBody.phone }, { email: verifyReqBody.email }] },
    });

    const createdVerify = await this.verifyRepository
      .create({
        phone: verifyReqBody.phone,
        email: verifyReqBody.email,
        password: randomStr + randomCode,
        smsSignature: verifyReqBody.smsSignature ?? ' ',
        registered: _.isObjectLike(user),
        createdAt: nowUTC.toISOString(),
        platform: this.ctx.request.headers['platform']?.toString().toLowerCase(),
        userAgent: this.ctx.request.headers['user-agent']?.toString().toLowerCase(),
        region: verifyReqBody.phone
          ? this.phoneNumberService.getRegionCodeISO(verifyReqBody.phone)
          : undefined,
      })
      .catch((err) => {
        throw new HttpErrors.NotAcceptable(err.message);
      });

    const userProfile = {
      [securityId]: createdVerify.getId().toString(),
      aud: 'verify',
    };

    const verifyToken: string = await this.jwtService.generateToken(userProfile);

    if (verifyReqBody.phone) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.smsService
        .sendSms(randomCode, verifyReqBody.phone, this.lang, verifyReqBody.smsSignature)
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
      let mailContent = fs.readFileSync(
        path.resolve(__dirname, '../../assets/confirmation_dongip_en.html'),
        'utf-8',
      );
      mailContent = util.format(mailContent, randomCode.split('').join(' '));

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.emailService
        .sendSupportMail({
          subject: this.locMsg['VERFIY_EMAIL_SUBJECT'][this.lang],
          toAddress: verifyReqBody.email,
          mailFormat: 'html',
          content: mailContent,
        })
        .then(async (res) => {
          await this.verifyRepository.updateById(createdVerify.getId(), {
            emailMessageId: res.data.messageId,
          });
        })
        .catch((err) => {
          console.error(new Date(), JSON.stringify(err), JSON.stringify(verifyReqBody));
        });
    }

    return {
      status: _.isObjectLike(user),
      isCompleted: Boolean(user?.phone),
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
            schema: {
              type: 'object',
              properties: {
                userId: { type: 'number' },
                phone: { type: 'string', nullable: true },
                email: { type: 'string', nullable: true },
                score: { type: 'number' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
            example: {
              userId: 1,
              phone: '+989171234567',
              email: 'dongip.supp@gmail.com',
              score: 260,
              accessToken: 'XXX.YYY.ZZZ',
              refreshToken: 'AAA.BBB.CCC',
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
                phone: '+989171234567',
                password: 'DNG123456',
              },
            },
            email: {
              value: {
                email: 'dongip.supp@gmail.com',
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
    phone?: string;
    email?: string;
    accessToken: string;
    refreshToken: string;
    totalScores: number;
  }> {
    if (
      (!_.has(credentials, 'phone') && !_.has(credentials, 'email')) ||
      (_.has(credentials, 'phone') && _.has(credentials, 'email'))
    ) {
      throw new HttpErrors.UnprocessableEntity(
        this.locMsg['PHONE_OR_EMAIL_NOT_PROVIDED'][this.lang],
      );
    }

    const verifyId = +currentUserProfile[securityId];

    try {
      await this.verifySerivce.verifyCredentials(verifyId, credentials.password);

      // Ensure the user exists and the password is correct
      const user = await this.userService.verifyCredentials(credentials);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.updateById(user.getId(), {
        firebaseToken: firebaseToken,
        platform: String(this.ctx.request.headers['platform']),
        userAgent: String(this.ctx.request.headers['user-agent']),
      });

      // Get total user's scores
      const scores = await this.getUserScores(user.getId());
      //convert a User object to a UserProfile object (reduced set of properties)
      const userProfile = this.userService.convertToUserProfile(user);
      userProfile['aud'] = 'access';
      userProfile['roles'] = user.roles;

      //create a JWT token based on the Userprofile
      const accessToken = await this.jwtService.generateToken(userProfile);
      let refTokenObj = await this.refreshTokenService.getToken(userProfile);
      if (!refTokenObj.refreshToken) {
        refTokenObj = await this.refreshTokenService.generateToken(userProfile, accessToken);
      }
      const refToken = refTokenObj.refreshToken!;

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.verifyRepository.updateById(verifyId, {
        loggedIn: true,
        loggedInAt: moment.utc().toISOString(),
      });

      return {
        userId: user.getId(),
        phone: user.phone,
        email: user.email,
        totalScores: scores,
        accessToken: accessToken,
        refreshToken: refToken,
      };
    } catch (err) {
      const errMsg = this.locMsg[err.message][this.lang];
      console.error(errMsg);
      throw new HttpErrors.UnprocessableEntity(errMsg);
    }
  }

  @post('/signup', {
    summary: 'Signup and login',
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
              accessToken: 'XXX.YYY.ZZZ',
              refreshToken: 'AAA.BBB.CCC',
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
              'firebaseToken',
              'registeredAt',
              'usersRels',
              'virtualUsers',
              'region',
              'platform',
              'email',
              'phoneLocked',
              'emailLocked',
            ],
            optional: ['username', 'currency', 'language', 'phone'],
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
    @param.header.string('accept-language') lang?: string,
  ): Promise<{
    userId: typeof Users.prototype.userId;
    planId: string | null;
    solTime: string | null;
    eolTime: string | null;
    accessToken: string;
    refreshToken?: string;
    totalScores: number;
  }> {
    const verifyId = +currentUserProfile[securityId],
      nowUTC = moment.utc(),
      userLanguage = newUser.language,
      userCurrency = newUser.currency;

    try {
      const foundVerify = await this.verifySerivce.verifyCredentials(verifyId, newUser.password);

      const countRegisteredUsers = await this.usersRepository.count();
      const roles = countRegisteredUsers.count < 1000 ? ['GOLD'] : ['BRONZE'];
      const planId = countRegisteredUsers.count < 1000 ? 'plan_gy1' : 'free';

      const userEntity = new Users({
        roles: roles,
        name: newUser.name,
        avatar: newUser.avatar,
        phone: foundVerify.phone,
        email: foundVerify.email,
        region: foundVerify.region ?? undefined,
        firebaseToken: firebaseToken,
        phoneLocked: Boolean(_.get(foundVerify, 'phone')),
        emailLocked: Boolean(_.get(foundVerify, 'email')),
        platform: String(this.ctx.request.headers['platform']),
        userAgent: String(this.ctx.request.headers['user-agent']),
      });
      const savedUser = await this.usersRepository.create(userEntity);

      if (roles.includes('GOLD')) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.usersRepository.subscriptions(savedUser.getId()).create({
          planId: 'plan_gy1',
          solTime: nowUTC.toISOString(),
          eolTime: nowUTC.add(1, 'year').toISOString(),
        });
      }

      const savedScore = await this.usersRepository.scores(savedUser.getId()).create({ score: 50 });

      // Convert user object to a UserProfile object (reduced set of properties)
      const userProfile = this.userService.convertToUserProfile(savedUser);
      userProfile['aud'] = 'access';
      userProfile['roles'] = roles;

      const accessToken = await this.jwtService.generateToken(userProfile);
      const tokenObj = await this.refreshTokenService.generateToken(userProfile, accessToken);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository
        .usersRels(savedUser.getId())
        .create({
          type: 'self',
          name: savedUser.name,
          avatar: savedUser.avatar,
          phone: foundVerify.phone,
          email: foundVerify.email,
        })
        .then(async (rel) => {
          await this.usersRepository
            .usersRels(savedUser.getId())
            .patch({ mutualUserRelId: rel.getId() }, { userRelId: rel.getId() });
        });

      const categoriesList = this.catSrc[this.lang];
      const initCatList: Categories[] = [];
      _.forEach(categoriesList, (cat) => {
        initCatList.push(
          new Categories({ userId: savedUser.userId, icon: cat.icon, title: cat.title }),
        );
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.categoriesRepository.createAll(initCatList);
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
        planId: planId,
        solTime: roles.includes('GOLD') ? nowUTC.toISOString() : null,
        eolTime: roles.includes('GOLD') ? nowUTC.add(1, 'year').toISOString() : null,
        totalScores: savedScore.score,
        ...tokenObj,
      };
    } catch (err) {
      if (err.message === 'WRONG_VERIFY_CODE') {
        throw new HttpErrors.NotAcceptable(this.locMsg[err.message][this.lang]);
      } else if (
        err.errno === 1062 &&
        err.code === 'ER_DUP_ENTRY' &&
        err.sqlMessage.endsWith("'phone'")
      ) {
        throw new HttpErrors.Conflict(this.locMsg['SINGUP_CONFILCT_PHONE'][this.lang]);
      } else if (
        err.errno === 1062 &&
        err.code === 'ER_DUP_ENTRY' &&
        err.sqlMessage.endsWith("'email'")
      ) {
        throw new HttpErrors.Conflict(this.locMsg['COMPLETE_SIGNUP_CONFILICT_EMAIL'][this.lang]);
      } else if (err.errno === 1406 && err.code === 'ER_DATA_TOO_LONG') {
        throw new HttpErrors.NotAcceptable(err.message);
      } else {
        throw new HttpErrors.NotAcceptable(err.message);
      }
    }
  }

  @get('/refresh-token', {
    summary: 'Get a new access token with provided refresh token',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'New access token',
        content: {
          'application/josn': {
            schema: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
            example: {
              accessToken: 'XXX.YYY.ZZZ',
              refreshToken: 'AAA.BBB.CCC',
            },
          },
        },
      },
    },
  })
  @authenticate.skip()
  async refreshToken(): Promise<TokenObject> {
    try {
      const refToken = this.ctx.request.headers.authorization!.split(' ')[1];
      const tokenObj = await this.refreshTokenService.refreshToken(refToken);
      return tokenObj;
    } catch (err) {
      if (err.message === 'REFRESH_TOKEN_NOT_MATCHED') {
        throw new HttpErrors.Unauthorized(this.locMsg['REFRESH_TOKEN_NOT_MATCHED'][this.lang]);
      } else {
        throw new HttpErrors.Unauthorized(err.message);
      }
    }
  }

  @get('/logout', {
    summary: 'Logout from app',
    description: "Blacklist access token and remove user's firebase token property",
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
    this.usersRepository.updateById(userId, { firebaseToken: undefined });
  }
}
