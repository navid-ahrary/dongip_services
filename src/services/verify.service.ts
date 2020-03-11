import {bind, BindingScope, inject} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';

import {VerifyRepository} from '../repositories';
import {Credentials, Verify} from '../models';
import {PasswordHasher} from '../services';
import {PasswordHasherBindings} from '../keys';

@bind({scope: BindingScope.SINGLETON})
export class VerifyService {
  constructor (
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @repository(VerifyRepository) public verifyRepo: VerifyRepository
  ) {}

  public async verifyCredentials (credentials: Credentials): Promise<Verify> {
    const invalidCredentialsError = 'Invalid phone/password !';

    const foundVerify = await this.verifyRepo.findOne({
      where: {phone: credentials.phone},
    });

    if (!foundVerify) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const isMatched = await this.passwordHasher.comparePassword(
      credentials.password, foundVerify?.password
    );

    if (!isMatched) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.verifyRepo.delete(foundVerify);

    return foundVerify;
  }
}
