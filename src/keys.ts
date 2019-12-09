import {BindingKey} from '@loopback/context';
import {PasswordHasher} from './services/hash.password.bcryptjs';
import {TokenService, UserService} from '@loopback/authentication';
import {Users} from './models';
import {Credentials} from './repositories';

export namespace TokenServiceConstants {
  export const TOKEN_SECRET_VALUE = 'Kk&^e*@0oaE!KvT';
  export const TOKEN_EXPIRES_IN_VALUE = '1209600';
  export const TOKEN_ALGORITHM_VALUE = 'HS384';
}

export namespace TokenServiceBindings {
  export const TOKEN_SECRET = BindingKey.create<string>('authentication.jwt.secret');
  export const TOKEN_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.expires.in.seconds',
  );
  export const TOKEN_ALGORITHM = BindingKey.create<string>(
    'authentication.jwt.token.algorithm',
  );
  export const TOKEN_SERVICE = BindingKey.create<TokenService>(
    'services.authentication.jwt.tokenservice',
  );
}

export namespace PasswordHasherBindings {
  export const PASSWORD_HASHER = BindingKey.create<PasswordHasher>('services.hasher');
  export const ROUNDS = BindingKey.create<number>('services.hasher.round');
}

export namespace UserServiceBindings {
  export const USER_SERVICE = BindingKey.create<UserService<Users, Credentials>>(
    'services.user.service',
  );
}
