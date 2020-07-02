import {bind, BindingScope, inject} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';

import Debug from 'debug';
const debug = Debug('dongip');

import {VerifyRepository} from '../repositories';
import {Verify} from '../models';

@bind({scope: BindingScope.TRANSIENT})
export class VerifyService {
  constructor(
    @repository(VerifyRepository) public verifyRepo: VerifyRepository,
  ) {}

  public async verifyCredentials(
    verifyId: number,
    password: string,
  ): Promise<Verify> {
    const invalidCredentialsError = 'Invalid credentials!';

    const foundVerify = await this.verifyRepo.findOne({
      where: {verifyId: verifyId},
    });

    if (!foundVerify) {
      debug(invalidCredentialsError);
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    if (password !== foundVerify.password) {
      console.log(invalidCredentialsError);
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    return foundVerify;
  }
}
