import {bind, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';

import AwesomePhoneNumber from 'awesome-phonenumber';

import {UsersRepository} from '../repositories';

@bind({scope: BindingScope.CONTEXT})
export class PhoneNumberService {
  constructor(
    @repository(UsersRepository) public usersRepository: UsersRepository,
  ) {}

  /**
   *
   * @param phone string
   * @return boolean
   */
  isValid(phone: string): boolean {
    const pn = new AwesomePhoneNumber(phone);
    return pn.isMobile() && pn.canBeInternationallyDialled();
  }

  /**
   *
   * @param phone string | string[]
   * @return string
   */
  convertToE164Format(phone: string): string {
    const pn = new AwesomePhoneNumber(phone);
    return pn.getNumber('e164');
  }

  /**
   *
   * @param phone string
   * @param regionCode string
   * @return string
   */
  replacePrefixZeroWithCountryCode(phone: string, regionCode: string): string {
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
   * @param phone string
   * @return string
   */
  getRegionCodeISO(phone: string): string {
    if (this.isValid(phone)) {
      const pn = new AwesomePhoneNumber(phone);
      return pn.getRegionCode();
    } else {
      throw new Error('Phone number is not valid');
    }
  }
}
