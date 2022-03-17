/* eslint-disable @typescript-eslint/naming-convention */
import { authenticate, TokenService, UserService } from '@loopback/authentication';
import { OPERATION_SECURITY_SPEC, TokenObject } from '@loopback/authentication-jwt';
import { inject, intercept, service } from '@loopback/core';
import { LoggingBindings, WinstonLogger } from '@loopback/logging';
import { repository } from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  post,
  requestBody,
  RequestContext,
} from '@loopback/rest';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import _ from 'lodash';
import moment from 'moment';
import { ValidatePasswordInterceptor, ValidatePhoneEmailInterceptor } from '../interceptors';
import { LocMsgsBindings, TokenServiceBindings, UserServiceBindings } from '../keys';
import { Credentials, NewUser, Settings, Users, Verify } from '../models';
import { BlacklistRepository, UsersRepository, VerifyRepository } from '../repositories';
import { RefreshtokenService, UserScoresService, VerifyService } from '../services';
import { LocalizedMessages } from '../types';

@intercept(ValidatePhoneEmailInterceptor.BINDING_KEY, ValidatePasswordInterceptor.BINDING_KEY)
export class AuthController {
  lang: string;

  constructor(
    @inject.context() private ctx: RequestContext,
    @inject(LocMsgsBindings) private locMsg: LocalizedMessages,
    @inject(LoggingBindings.WINSTON_LOGGER) private logger: WinstonLogger,
    @inject(TokenServiceBindings.TOKEN_SERVICE) private jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE) private userService: UserService<Users, Credentials>,
    @service(VerifyService) private verifyService: VerifyService,
    @service(UserScoresService) private userScoresService: UserScoresService,
    @service(RefreshtokenService) private refreshTokenService: RefreshtokenService,
    @repository(UsersRepository) private usersRepository: UsersRepository,
    @repository(VerifyRepository) private verifyRepository: VerifyRepository,
    @repository(BlacklistRepository) private blacklistRepository: BlacklistRepository,
  ) {
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  @post('/auth/verify', {
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
              'deleted',
            ],
            optional: ['smsSignature', 'phone', 'email', 'verifyStrategy'],
          }),
          examples: {
            phone: {
              description: 'SMS a verify code to the phone number',
              value: {
                phone: '+989171234567',
                smsSignature: 'a2V5dG9vbCB',
                verifyStrategy: 'phone',
              },
            },
            email: {
              description: 'Email a verify code',
              value: {
                email: 'dongip.supp@gmail.com',
                verifyStrategy: 'email',
              },
            },
            google: {
              description: 'This email verified by google, do not email a verify code',
              value: {
                email: 'dongip.supp@gmail.com',
                verifyStrategy: 'google',
              },
            },
          },
        },
      },
    })
    verifyReqBody: Verify,
    @param.header.string('accept-language', { required: false }) langHeader: string,
  ) {
    if (
      (!_.has(verifyReqBody, 'phone') && !_.has(verifyReqBody, 'email')) ||
      (_.has(verifyReqBody, 'phone') && _.has(verifyReqBody, 'email'))
    ) {
      throw new HttpErrors.UnprocessableEntity('One of phone and email must be provided');
    }

    const countRequstedVerifyCode = await this.verifyRepository.count({
      ipAddress: this.ctx.request.headers['ar-real-ip']?.toString(),
      phone: { nin: ['+989197744814', '+989176502184'] },
      email: { nin: ['arefrafei92@gmail.com', 'navidarry@gmail.com'] },
      createdAt: {
        between: [moment.utc().subtract(5, 'minutes').toISOString(), moment.utc().toISOString()],
      },
    });

    if (countRequstedVerifyCode.count >= 3) {
      throw new HttpErrors.TooManyRequests(this.locMsg['TOO_MANY_REQUEST'][this.lang]);
    }

    try {
      if (verifyReqBody.phone) {
        const phoneValue = verifyReqBody.phone;
        const smsSignature = verifyReqBody.smsSignature;

        const res = await this.verifyService.verifyWithPhone(phoneValue, smsSignature);
        return res;
      } else if (verifyReqBody.email) {
        const emailValue = verifyReqBody.email;

        if (verifyReqBody.verifyStrategy === 'google') {
          return await this.verifyService.loginWithGoogle(emailValue);
        }
        const res = await this.verifyService.verifyWithEmail(emailValue);
        return res;
      }
    } catch (err) {
      this.logger.log('error', err.message);
    }
  }

  @post('/auth/login', {
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
      const errMsg = this.locMsg['PHONE_OR_EMAIL_NOT_PROVIDED'][this.lang];
      this.logger.log('error', errMsg);
      throw new HttpErrors.UnprocessableEntity(errMsg);
    }

    const verifyId = +currentUserProfile[securityId];

    try {
      await this.verifyService.verifyCredentials(verifyId, credentials.password);

      // Ensure the user exists and the password is correct
      const user = await this.userService.verifyCredentials(credentials);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository.updateById(user.getId(), {
        firebaseToken: firebaseToken,
        platform: this.ctx.request.headers['platform']?.toString(),
        userAgent: this.ctx.request.headers['user-agent'],
      });

      const scores = await this.userScoresService.getUserScores(user.getId());

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

      const resp = {
        userId: user.getId(),
        phone: user.phone,
        email: user.email,
        totalScores: scores,
        accessToken: accessToken,
        refreshToken: refToken,
      };
      return resp;
    } catch (err) {
      this.logger.log('error', err.message);
      const errMsg = this.locMsg[err.message][this.lang];
      throw new HttpErrors.UnprocessableEntity(errMsg);
    }
  }

  @post('/auth/signup', {
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
                'appVersion',
                'enabled',
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
              'appVersion',
              'enabled',
              'deleted',
              'isCompleted',
              'createdAt',
            ],
            optional: ['username', 'currency', 'language', 'phone', 'marketplace'],
          }),
          example: {
            phone: '+989171234567',
            name: 'Dongip',
            username: 'dongipapp',
            language: 'fa',
            currency: 'IRR',
            avatar: '/assets/avatar/avatar_1.png',
            password: 'DNG123456',
            marketplace: 'google-play',
          },
        },
      },
    })
    newUser: NewUser,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.header.string('firebase-token') firebaseToken?: string,
  ): Promise<{
    userId: typeof Users.prototype.userId;
    planId: string | null;
    solTime: string | null;
    eolTime: string | null;
    accessToken: string;
    refreshToken?: string;
    totalScores: number;
  }> {
    const verifyId = +currentUserProfile[securityId];
    const nowUTC = moment.utc();
    const userLanguage = newUser.language;
    const userCurrency = newUser.currency;

    try {
      const foundVerify = await this.verifyService.verifyCredentials(verifyId, newUser.password);

      const userEntity = new Users({
        name: newUser.name,
        avatar: newUser.avatar,
        phone: foundVerify.phone,
        email: foundVerify.email,
        region: foundVerify.region,
        firebaseToken: firebaseToken,
        phoneLocked: Boolean(foundVerify.phone),
        emailLocked: Boolean(foundVerify.email),
        platform: this.ctx.request.headers['platform']?.toString(),
        userAgent: this.ctx.request.headers['user-agent'],
        appVersion: this.ctx.request.headers['app-version']?.toString(),
        marketplace: newUser.marketplace,
        isCompleted: false,
      });

      const settingEntity = new Settings({
        language: userLanguage,
        currency: userCurrency,
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.verifyRepository.updateById(verifyId, {
        loggedIn: true,
        loggedInAt: nowUTC.toISOString(),
      });

      return await this.verifyService.createUser(userEntity, settingEntity);
    } catch (err) {
      if (err.message === 'WRONG_VERIFY_CODE') {
        this.logger.log('error', `WRONG_VERIFY_CODE ${err.message}`);
        const errMsg = this.locMsg[err.message][this.lang];
        throw new HttpErrors.NotAcceptable(errMsg);
      } else if (
        err.errno === 1062 &&
        err.code === 'ER_DUP_ENTRY' &&
        err.sqlMessage.endsWith("'phone'")
      ) {
        this.logger.log('error', `ER_DUP_ENTRY_PHONE ${err.message}`);
        const errMsg = this.locMsg['SINGUP_CONFILCT_PHONE'][this.lang];
        throw new HttpErrors.Conflict(errMsg);
      } else if (
        err.errno === 1062 &&
        err.code === 'ER_DUP_ENTRY' &&
        err.sqlMessage.endsWith("'email'")
      ) {
        this.logger.log('error', `ER_DUP_ENTRY_EMAIL ${err.message}`);
        const errMsg = this.locMsg['COMPLETE_SIGNUP_CONFILICT_EMAIL'][this.lang];
        throw new HttpErrors.Conflict(errMsg);
      } else if (err.errno === 1406 && err.code === 'ER_DATA_TOO_LONG') {
        const errMsg = err.message;
        this.logger.log('error', `ER_DATA_TOO_LONG ${errMsg}`);
        throw new HttpErrors.NotAcceptable(errMsg);
      } else {
        const errMsg = err.message;
        this.logger.log('error', `UNHANDLED_ERROR ${errMsg}`);
        throw new HttpErrors.NotAcceptable(errMsg);
      }
    }
  }

  @get('/auth/refresh-token', {
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

  @get('/auth/logout', {
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.refreshTokenService.revokeToken(userId);
  }
}
