/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable require-atomic-updates */
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {post, requestBody, HttpErrors, get, param, patch} from '@loopback/rest';
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
import {
  CredentialsRequestBody,
  UserLoginResponse,
  VerifyPhoneResponse,
  UserSignupRequestBody,
  UserPatchRequestBody,
  UserSignupResponse,
  VerifyPhoneRequestBody,
} from './specs/user-controller.specs';
import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';
import {Users, Credentials, Blacklist, Verify} from '../models';
import {
  UsersRepository,
  BlacklistRepository,
  VerifyRepository,
} from '../repositories';
import {
  FirebaseService,
  SmsService,
  validatePhoneNumber,
  PasswordHasher,
  TimeService,
  VerifyService
} from '../services';

export class UsersController {
  constructor (
    @repository(UsersRepository) public usersRepository: UsersRepository,
    @repository(BlacklistRepository)
    public blacklistRepository: BlacklistRepository,
    @repository(VerifyRepository) private verifyRepo: VerifyRepository,
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

  private generateRandomString (length: number) {
    let result = '',
      characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  private checkUserKey (userKey: string, currentUserProfile: UserProfile) {
    if (userKey !== currentUserProfile[securityId]) {
      throw new HttpErrors.Unauthorized(
        'Token is not matched to this user _key!',
      );
    }
  }

  @post('/api/users/verify', {
    responses: VerifyPhoneResponse,
  })
  @authenticate.skip()
  async verify (
    @requestBody(VerifyPhoneRequestBody) body: Verify,
    @param.header.string('User-Agent') userAgent?: string,
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
      user: Users | null,
      randomCode = Math.random()
        .toFixed(7)
        .slice(3),
      randomStr = this.generateRandomString(3),
      payload,
      token: string,
      userProfile: UserProfile;

    try {
      validatePhoneNumber(body.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.NotAcceptable(_err.message);
    }

    user = await this.usersRepository.findOne({
      where: {phone: body.phone},
      fields: {
        name: true,
        avatar: true,
      },
    });
    if (user) {
      status = true;
    }

    await this.verifyRepo.createHumanKind({
      phone: body.phone,
      password: await this.passwordHasher.hashPassword(randomStr + randomCode),
      registered: status,
      registerationToken: body.registerationToken,
      agent: userAgent,
      issuedAt: new Date()
    })
      .then(async _res => {
        userProfile = {
          [securityId]: _res._key,
          aud: 'verify'
        };
        // Generate verify token based on user profile
        token = await this.jwtService.generateToken(userProfile);
        try {
          // send verify token and prefix by notification
          payload = {
            data: {
              verifyToken: token
            },
          };
          this.firebaseService.sendToDeviceMessage(body.registerationToken, payload);
        } catch (_err) {
          console.log(_err);
          throw new HttpErrors.UnprocessableEntity(_err.message);
        }
      })
      .catch(_err => {
        console.log(_err);
        throw new HttpErrors.Conflict(_err.message);
      });

    // send verify code with sms
    this.smsService.sendSms('dongip', randomCode, body.phone);

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

  @post('/api/users/login', {
    security: OPERATION_SECURITY_SPEC,
    responses: UserLoginResponse,
  })
  @authenticate('jwt.verify')
  async login (
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{
    _key: string;
    _id: string;
    accessToken: string;
    refreshToken: string;
  }> {
    let userProfile: UserProfile,
      user: Users,
      verify: Verify,
      accessToken: string;

    try {
      validatePhoneNumber(credentials.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    try {
      verify = await this.verifySerivce.verifyCredentials(credentials);

      //ensure the user exists and the password is correct
      user = await this.userService.verifyCredentials(credentials);

      this.usersRepository.updateById(user._key, {
        userAgent: verify.agent,
        registerationToken: verify.registerationToken,
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
      _key: user._key,
      _id: user._id,
      accessToken: accessToken,
      refreshToken: user.refreshToken,
    };
  }

  @post('/api/users/signup', {
    security: OPERATION_SECURITY_SPEC,
    responses: UserSignupResponse,
  })
  @authenticate('jwt.verify')
  async signup (
    @requestBody(UserSignupRequestBody) newUser: Users,
  ): Promise<{
    _key: string;
    _id: string;
    accessToken: string;
    refreshToken: string;
  }> {
    let savedUser: Users,
      verify: Verify,
      accessToken: string,
      userProfile: UserProfile,
      credentials = Object.assign(
        new Credentials,
        {
          phone: newUser.phone,
          password: newUser.password
        }
      );

    try {
      validatePhoneNumber(credentials.phone);
    } catch (_err) {
      console.log(_err);
      throw new HttpErrors.UnprocessableEntity(_err.message);
    }

    verify = await this.verifySerivce.verifyCredentials(credentials);
    try {
      newUser['registeredAt'] = new Date();
      newUser['registerationToken'] = verify.registerationToken;
      newUser['userAgent'] = verify.agent;
      delete newUser['password'];

      // Create a new user
      savedUser = await this.usersRepository.createHumanKind(newUser);

      //convert user object to a UserProfile object (reduced set of properties)
      userProfile = this.userService.convertToUserProfile(savedUser);
      userProfile['aud'] = 'access';

      //create a JWT token based on the Userprofile
      accessToken = await this.jwtService.generateToken(userProfile);

      // Create self-relation for self accounting
      await this.usersRepository.createHumanKindUsersRels(savedUser._id, {
        _to: savedUser._id,
        alias: savedUser.name,
        avatar: savedUser.avatar,
        type: 'self',
      });

      return {
        _key: savedUser._key,
        _id: savedUser._id,
        accessToken: accessToken,
        refreshToken: savedUser.refreshToken,
      };
    } catch (_err) {
      console.log(_err);
      if (_err.code === 409) {
        throw new HttpErrors.Conflict(_err.response.body.errorMessage);
      } else {
        throw new HttpErrors.NotAcceptable(_err);
      }
    }
  }

  @get('/api/users/{_userKey}/logout', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: "Logout current user's client",
      },
    },
  })
  @authenticate('jwt.access')
  async logout (
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.header.string('authorization') authorizationHeader: string,
    @param.path.string('_userKey') _userKey: string,
  ): Promise<Blacklist> {
    this.checkUserKey(_userKey, currentUserProfile);

    return this.blacklistRepository
      .createHumanKind({
        token: authorizationHeader.split(' ')[1],
        createdAt: new Date(),
      })
      .catch(_err => {
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

  @patch('/api/users/{_userKey}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  })
  @authenticate('jwt.access')
  async updateById (
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.string('_userKey') _userKey: string,
    @requestBody(UserPatchRequestBody) user: Omit<Users, '_key'>,
  ): Promise<Users> {
    this.checkUserKey(_userKey, currentUserProfile);

    await this.usersRepository.updateById(_userKey, user);
    return this.usersRepository.findById(_userKey, {
      fields: {_rev: true},
    });
  }

  @get('/api/users/{_userKey}/refresh-token', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'New access token',
      },
    },
  })
  @authenticate('jwt.refresh')
  async refreshToken (
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.header.string('Authorization') token: string,
  ) {
    let user: Users,
      userProfile: UserProfile,
      accessToken: string,
      isMatched: boolean;

    user = await this.usersRepository.findById(currentUserProfile[securityId]);
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
