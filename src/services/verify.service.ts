import {bind, BindingScope} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';

import {VerifyRepository} from '../repositories';
import {Verify} from '../models';

@bind({scope: BindingScope.TRANSIENT})
export class VerifyService {
  constructor(
    @repository(VerifyRepository) public verifyRepository: VerifyRepository,
  ) {}

  public async verifyCredentials(
    verifyId: number,
    password: string,
  ): Promise<Verify> {
    const foundVerify = await this.verifyRepository.findOne({
      where: {verifyId: verifyId},
    });

    if (!foundVerify) {
      console.error('برای شماره موبایل شما کدی ارسال نشده');
      throw new HttpErrors.NotFound('برای شماره موبایل شما کدی ارسال نشده');
    }

    if (password !== foundVerify.password) {
      console.error('کد وارد شده اشتباهه');
      throw new HttpErrors.UnprocessableEntity('کد وارد شده اشتباهه');
    }

    return foundVerify;
  }
}
