import { BindingScope, injectable } from '@loopback/core';
import { repository } from '@loopback/repository';
import AwesomePhoneNumber from 'awesome-phonenumber';
import { UsersRepository } from '../repositories';

@injectable({ scope: BindingScope.TRANSIENT })
export class PhoneNumberService {
  constructor(@repository(UsersRepository) public usersRepository: UsersRepository) {}

  /**
   *
   * @param {String} phone
   * @returns boolean
   */
  isValid(phone: string): boolean {
    const pn = new AwesomePhoneNumber(phone);
    return pn.isMobile() && pn.canBeInternationallyDialled();
  }

  /**
   *
   * @param phone string | string[]
   * @returns string
   */
  convertToE164Format(phone: string): string {
    const pn = new AwesomePhoneNumber(phone);
    return pn.getNumber('e164');
  }

  /**
   *
   * @param {String} phone
   * @param {String} regionCode
   * @returns string
   */
  normalizeZeroPrefix(phone: string, regionCode = 'IR'): string {
    if (phone.startsWith('00')) {
      phone = phone.replace('00', '+');
      const pn = new AwesomePhoneNumber(phone, regionCode);
      return pn.getNumber('e164');
    } else if (phone.startsWith('0')) {
      const pn = new AwesomePhoneNumber(phone, regionCode);
      return pn.getNumber('e164');
    } else {
      const pn = new AwesomePhoneNumber(phone, regionCode);
      return pn.getNumber('e164');
    }
  }

  /**
   *
   * @param {String} phone
   * @returns string
   */
  getRegionCodeISO(phone: string): string {
    if (this.isValid(phone)) {
      const pn = new AwesomePhoneNumber(phone);
      return pn.getRegionCode();
    } else {
      throw new Error('Phone number is not valid');
    }
  }

  /**
   *
   * @param {String} phone
   * @returns string
   */
  formatForSendSMSFromIran(phone: string): string {
    const pn = new AwesomePhoneNumber(phone);
    return pn.getNumberFrom('IR').replace(/\s/g, '');
  }

  /**
   *
   * @param {String} phone
   * @returns string
   */
  getRegionCode(phone: string): string {
    const pn = new AwesomePhoneNumber(phone);
    return pn.getRegionCode();
  }

  /**
   *
   * @param {String} phone
   * @returns boolean
   */
  isFromIran(phone: string): boolean {
    const normalizedPhone = this.convertToE164Format(phone);
    const region = this.getRegionCode(normalizedPhone);
    return region === 'IR';
  }
}
