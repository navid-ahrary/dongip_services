import { BindingScope, inject, injectable, service } from '@loopback/core';
import { HttpErrors, RequestContext } from '@loopback/rest';
import { repository } from '@loopback/repository';
import { securityId } from '@loopback/security';
import moment from 'moment';
import _ from 'lodash';
import util from 'util';
import fs from 'fs';
import path from 'path';
import {
  CategoriesRepository,
  UsersRelsRepository,
  UsersRepository,
  VerifyRepository,
} from '../repositories';
import { Categories, PostDong, Settings, Users, UsersRels, Verify } from '../models';
import { CategoriesSourceListBindings, LocMsgsBindings } from '../keys';
import {
  Credentials,
  TokenServiceBindings,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import { CategoriesSource, LocalizedMessages } from '../types';
import { TokenService, UserService } from '@loopback/authentication';
import { SmsService } from './sms.service';
import { DongService } from './dong.service';
import { EmailService } from './email.service';
import { UserScoresService } from './user-scores.service';
import { PhoneNumberService } from './phone-number.service';
import { RefreshtokenService } from './refreshtoken.service';

@injectable({ scope: BindingScope.TRANSIENT })
export class VerifyService {
  private lang: string;
  private readonly randomCode: string;
  private readonly randomString: string;

  constructor(
    @inject.context() public ctx: RequestContext,
    @inject(LocMsgsBindings) private locMsg: LocalizedMessages,
    @inject(CategoriesSourceListBindings) private catSrc: CategoriesSource,
    @inject(TokenServiceBindings.TOKEN_SERVICE) private jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE) private userService: UserService<Users, Credentials>,
    @service(SmsService) private smsService: SmsService,
    @service(DongService) private dongService: DongService,
    @service(EmailService) private emailService: EmailService,
    @service(UserScoresService) private userScoresService: UserScoresService,
    @service(RefreshtokenService) private refreshTokenService: RefreshtokenService,
    @service(PhoneNumberService) private phoneNumberService: PhoneNumberService,
    @repository(UsersRepository) private usersRepository: UsersRepository,
    @repository(VerifyRepository) private verifyRepository: VerifyRepository,
    @repository(UsersRelsRepository) private usersRelsRepository: UsersRelsRepository,
    @repository(CategoriesRepository) private categoriesRepository: CategoriesRepository,
  ) {
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
    this.randomCode = Math.random().toFixed(7).slice(3);
    this.randomString = this.generateRandomPassword(3);
  }

  public async verifyCredentials(verifyId: number, password: string): Promise<Verify> {
    const foundVerify = await this.verifyRepository.findOne({
      fields: {
        verifyId: true,
        phone: true,
        email: true,
        region: true,
        platform: true,
        userAgent: true,
      },
      where: { verifyId: verifyId, password: password, loggedIn: false },
    });

    if (!foundVerify) {
      console.error(new Date(), 'Wrong Verify Code', password);
      throw new Error('WRONG_VERIFY_CODE');
    }

    return foundVerify;
  }

  /*
   * Add service methods here
   */
  private generateRandomPassword(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&[]()_+-*~/?><:;|',
      charsLength = chars.length;

    let randomStr = '';
    for (let i = 0; i < length; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * charsLength));
    }

    return randomStr;
  }

  public async verifyWithPhone(phoneValue: string, smsSignature = ' ') {
    const foundUser = await this.usersRepository.findOne({
      fields: { name: true, avatar: true, phone: true, phoneLocked: true },
      where: { phone: phoneValue },
    });

    const createdVerify = await this.verifyRepository
      .create({
        phone: phoneValue,
        smsSignature: smsSignature,
        registered: _.isObjectLike(foundUser),
        password: this.randomString + this.randomCode,
        platform: this.ctx.request.headers['platform']?.toString(),
        region: this.phoneNumberService.getRegionCodeISO(phoneValue),
        userAgent: this.ctx.request.headers['user-agent']?.toString(),
        ipAddress: this.ctx.request.headers['x-real-ip']?.toString(),
      })
      .catch((err) => {
        throw new HttpErrors.NotAcceptable(err.message);
      });

    const userProfile = {
      [securityId]: createdVerify.getId().toString(),
      aud: 'verify',
    };

    const verifyToken: string = await this.jwtService.generateToken(userProfile);

    this.smsService
      .sendSms(this.randomCode, phoneValue, this.lang, smsSignature)
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
        console.error(moment().format(), JSON.stringify(err));
      });

    return {
      status: _.isObjectLike(foundUser),
      isCompleted: foundUser?.phoneLocked ?? false,
      avatar: foundUser?.avatar ?? 'dongip',
      name: foundUser?.name ?? 'noob',
      prefix: this.randomString,
      verifyToken: verifyToken,
    };
  }

  public async verifyWithEmail(emailValue: string) {
    const foundUser = await this.usersRepository.findOne({
      fields: { name: true, avatar: true, phone: true, phoneLocked: true },
      where: { email: emailValue },
    });

    const createdVerify = await this.verifyRepository
      .create({
        email: emailValue,
        verifyStrategy: 'email',
        registered: _.isObjectLike(foundUser),
        password: this.randomString + this.randomCode,
        platform: this.ctx.request.headers['platform']?.toString(),
        userAgent: this.ctx.request.headers['user-agent']?.toString(),
        ipAddress: this.ctx.request.headers['derak-real-ip']?.toString(),
      })
      .catch((err) => {
        throw new HttpErrors.NotAcceptable(err.message);
      });

    const userProfile = {
      [securityId]: createdVerify.getId().toString(),
      aud: 'verify',
    };

    const verifyToken: string = await this.jwtService.generateToken(userProfile);

    let mailContent = fs.readFileSync(
      path.resolve(__dirname, '../../assets/confirmation_dongip_en.html'),
      'utf-8',
    );
    mailContent = util.format(mailContent, this.randomCode);

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.emailService
      .sendSupportMail({
        subject: this.locMsg['VERFIY_EMAIL_SUBJECT'][this.lang],
        toAddress: emailValue,
        mailFormat: 'html',
        content: mailContent,
      })
      .then(async (res) => {
        await this.verifyRepository.updateById(createdVerify.getId(), {
          emailMessageId: res.data.messageId,
        });
      })
      .catch((err) => {
        console.error(moment().format(), JSON.stringify(err));
      });

    return {
      status: _.isObjectLike(foundUser),
      isCompleted: foundUser?.phoneLocked ?? false,
      avatar: foundUser?.avatar ?? 'dongip',
      name: foundUser?.name ?? 'noob',
      prefix: this.randomString,
      verifyToken: verifyToken,
    };
  }

  public async loginWithGoogle(emailValue: string) {
    try {
      let user = await this.usersRepository.findOne({ where: { email: emailValue } });

      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.verifyRepository.create({
          email: emailValue,
          verifyStrategy: 'google',
          registered: _.isObjectLike(user),
          password: this.randomString + this.randomCode,
          platform: this.ctx.request.headers['platform']?.toString(),
          userAgent: this.ctx.request.headers['user-agent']?.toString(),
          ipAddress: this.ctx.request.headers['x-real-ip']?.toString(),
          loggedIn: true,
          loggedInAt: moment().format('YYYY-MM-DDTHH:mm:ss+00:00'),
        });

        // Convert user object to a UserProfile object (reduced set of properties)
        const userProfile = this.userService.convertToUserProfile(user);
        userProfile['aud'] = 'access';
        userProfile['roles'] = user.roles;

        const accessToken = await this.jwtService.generateToken(userProfile);
        const tokenObj = await this.refreshTokenService.generateToken(userProfile, accessToken);

        const foundPlan = await this.usersRepository.subscriptions(user.getId()).find({
          where: {
            solTime: { lte: moment.utc().toISOString() },
            eolTime: { gte: moment.utc().toISOString() },
          },
        });
        const scores = await this.userScoresService.getUserScores(user.getId());

        const resp = {
          userId: user.getId(),
          status: _.isObjectLike(user),
          isCompleted: user?.phoneLocked ?? false,
          avatar: user?.avatar ?? 'dongip',
          phone: user.phone,
          name: user.name,
          email: user.email,
          totalScores: scores,
          planId: foundPlan.length ? foundPlan[0].planId : 'free',
          ...tokenObj,
        };

        return resp;
      } else {
        user = new Users({
          email: emailValue,
          emailLocked: true,
          userAgent: this.ctx.request.headers['user-agent'],
          platform: this.ctx.request.headers['platform']?.toString(),
          appVersion: this.ctx.request.headers['app-version']?.toString(),
        });
        const setting = new Settings({ language: this.lang });

        return await this.createUser(user, setting);
      }
    } catch (err) {
      console.error(err.message);
      const errMsg = this.locMsg[err.message][this.lang];
      throw new HttpErrors.UnprocessableEntity(errMsg);
    }
  }

  public async createUser(user: Partial<Users>, setting: Partial<Settings>) {
    try {
      const nowUTC = moment.utc();
      const mamdBirth1 = '2021-03-11T23:00:00+03:30';
      const mamdBirth2 = '2021-03-12T23:59:59+03:30';

      const roles = nowUTC.isBetween(moment(mamdBirth1), moment(mamdBirth2))
        ? ['GOLD']
        : ['BRONZE'];
      const planId = nowUTC.isBetween(moment(mamdBirth1), moment(mamdBirth2)) ? 'plan_gy1' : 'free';

      const userEntity = new Users({
        roles: roles,
        ...user,
      });
      const savedUser = await this.usersRepository.create(userEntity);

      const savedSetting = await this.usersRepository.setting(savedUser.getId()).create({
        language: setting.language,
        currency: setting.currency,
      });

      const selfRel = await this.usersRepository.usersRels(savedUser.getId()).create({
        type: 'self',
        name: savedUser.name,
        avatar: savedUser.avatar,
        phone: user.phone,
        email: user.email,
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.usersRepository
        .usersRels(savedUser.getId())
        .patch({ mutualUserRelId: selfRel.getId() }, { userRelId: selfRel.getId() });

      if (roles.includes('GOLD')) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.usersRepository.subscriptions(savedUser.getId()).create({
          planId: 'plan_gy1',
          solTime: moment(nowUTC).utc().toISOString(),
          eolTime: moment(nowUTC).utc().add(1, 'year').toISOString(),
        });
      }

      const savedScore = await this.usersRepository.scores(savedUser.getId()).create({ score: 50 });

      // Convert user object to a UserProfile object (reduced set of properties)
      const userProfile = this.userService.convertToUserProfile(savedUser);
      userProfile['aud'] = 'access';
      userProfile['roles'] = roles;

      const accessToken = await this.jwtService.generateToken(userProfile);
      const tokenObj = await this.refreshTokenService.generateToken(userProfile, accessToken);

      const resp = {
        userId: savedUser.getId(),
        planId: planId,
        status: _.isObjectLike(user),
        isCompleted: savedUser?.phoneLocked ?? false,
        avatar: savedUser?.avatar ?? 'dongip',
        solTime: roles.includes('GOLD') ? moment(nowUTC).utc().toISOString() : null,
        eolTime: roles.includes('GOLD') ? moment(nowUTC).utc().add(1, 'year').toISOString() : null,
        totalScores: savedScore.score,
        ...tokenObj,
      };

      await this.createDemoData(savedUser.getId(), selfRel.getId(), savedSetting.currency);

      return resp;
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

  async createDemoData(userId: typeof Users.prototype.userId, selfRelId: number, currency: string) {
    try {
      const categoriesList = this.catSrc[this.lang];
      const initCatList: Categories[] = [];
      _.forEach(categoriesList, (cat) => {
        initCatList.push(new Categories({ userId: userId, icon: cat.icon, title: cat.title }));
      });
      const savdDemoCats = await this.categoriesRepository.createAll(initCatList);

      const rel1 = new UsersRels({
        name: this.lang === 'fa' ? 'دوست من ۱' : 'My Friend A',
        userId: userId,
        phone: '+989170000000',
        avatar: 'assets/images/users/two/033-superhero.png',
      });

      const rel2 = new UsersRels({
        name: this.lang === 'fa' ? 'دوست من ۲' : 'My Friend B',
        userId: userId,
        phone: '+989120000000',
        avatar: 'assets/images/users/three/028-architect-min.png',
      });

      const savedRels = await this.usersRelsRepository.createAll([rel1, rel2]);

      await this.dongService.createDongs(
        userId,
        new PostDong({
          title: this.lang === 'fa' ? 'دنگ من ۱' : 'My Dong A',
          desc: '',
          userId: userId,
          categoryId: savdDemoCats[0].getId(),
          createdAt: new Date().toISOString(),
          pong: 8000,
          currency: currency,
          includeBill: true,
          includeBudget: true,
          billList: [
            { dongAmount: 4000, userRelId: selfRelId },
            { dongAmount: 4000, userRelId: savedRels[0].getId() },
          ],
          payerList: [{ paidAmount: 8000, userRelId: selfRelId }],
        }),
      );
      await this.dongService.createDongs(
        userId,
        new PostDong({
          title: this.lang === 'fa' ? 'دنگ من ۲' : 'My Dong B',
          desc: '',
          userId: userId,
          categoryId: savdDemoCats[1].getId(),
          createdAt: new Date().toISOString(),
          pong: 3000,
          currency: currency,
          includeBill: true,
          includeBudget: true,
          billList: [
            { dongAmount: 1000, userRelId: selfRelId },
            { dongAmount: 1000, userRelId: savedRels[0].getId() },
            { dongAmount: 1000, userRelId: savedRels[1].getId() },
          ],
          payerList: [{ paidAmount: 3000, userRelId: selfRelId }],
        }),
      );
      await this.dongService.createDongs(
        userId,
        new PostDong({
          title: this.lang === 'fa' ? 'دنگ من ۳' : 'My Dong C',
          desc: '',
          userId: userId,
          categoryId: savdDemoCats[3].getId(),
          createdAt: new Date().toISOString(),
          pong: 2800,
          currency: currency,
          includeBill: true,
          includeBudget: true,
          billList: [
            { dongAmount: 1400, userRelId: savedRels[0].getId() },
            { dongAmount: 1400, userRelId: savedRels[1].getId() },
          ],
          payerList: [{ paidAmount: 2800, userRelId: selfRelId }],
        }),
      );
    } catch (err) {
      console.error(err);
    }
  }
}
