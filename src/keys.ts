import { BindingKey } from '@loopback/context';
import { TokenService, UserService } from '@loopback/authentication';

import { Users, Credentials } from './models';
import { PasswordHasher } from './services';

export namespace TokenServiceConstants {
  export const ACCESS_SECRET_VALUE = process.env.ACCESS_SECRET!;
  export const VERIFY_EXPIRES_IN_VALUE = process.env.VERIFY_EXPIRES_IN!;
  export const JWT_ALGORITHM_VALUE = process.env.JWT_ALGORITHM!;
  export const ACCESS_EXPIRES_IN_VALUE = process.env.ACCESS_EXPIRES_IN!;
  export const REFRESH_EXPIRES_IN_VALUE = process.env.REFRESH_EXPIRES_IN!;
  export const REFRESH_SECRET_VALUE = process.env.REFRESH_SECRET!;
}

export namespace TokenServiceBindings {
  export const TOKEN_SERVICE = BindingKey.create<TokenService>(
    'services.authentication.jwt.tokenservice',
  );
  export const TOKEN_ALGORITHM = BindingKey.create<string>('authentication.jwt.algorithm');
  export const VERIFY_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.verify.expires.in.seconds',
  );
  export const ACCESS_SECRET = BindingKey.create<string>('authentication.jwt.access.secret');
  export const ACCESS_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.access.expires.in.seconds',
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

export namespace RefreshTokenServiceBindings {
  export const REFRESH_SECRET = BindingKey.create<string>('authentication.jwt.refresh.secret');
  export const REFRESH_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.refresh.expires.in.seconds',
  );
}
