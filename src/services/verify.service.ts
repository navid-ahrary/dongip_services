import { BindingScope, inject, injectable } from '@loopback/core';
import { RequestContext } from '@loopback/rest';
import { repository } from '@loopback/repository';
import _ from 'lodash';
import { VerifyRepository } from '../repositories';
import { Verify } from '../models';

@injectable({ scope: BindingScope.TRANSIENT })
export class VerifyService {
  lang: string;

  constructor(
    @inject.context() public ctx: RequestContext,
    @repository(VerifyRepository) public verifyRepository: VerifyRepository,
  ) {
    this.lang = _.includes(this.ctx.request.headers['accept-language'], 'en') ? 'en' : 'fa';
  }

  public async verifyCredentials(verifyId: number, password: string): Promise<Verify> {
    const foundVerify = await this.verifyRepository.findOne({
      where: { verifyId: verifyId, password: password },
    });

    if (!foundVerify) {
      console.error(new Date(), 'Wrong Verify Code', password);
      throw new Error('WRONG_VERIFY_CODE');
    }

    return foundVerify;
  }
}
