import { UserService } from '@loopback/authentication'
import { Credentials, Verify } from '../models'
import { inject } from '@loopback/core'
import { repository } from '@loopback/repository'
import { VerifyRepository, } from '../repositories'
import { PasswordHasherBindings } from '../keys'
import { PasswordHasher } from './hash.password.bcryptjs'
import { securityId } from '@loopback/security'
import { HttpErrors } from '@loopback/rest'

export class MyVerifyService implements UserService<Verify, Credentials> {
  constructor (
    @repository( VerifyRepository ) public verifyRepository: VerifyRepository,
    @inject( PasswordHasherBindings.PASSWORD_HASHER )
    public passwordHasher: PasswordHasher,
  ) { }

  async verifyCredentials ( credentials: Credentials ): Promise<Verify> {
    const invalidCredentialsError = `Invalid phone or password.`

    const foundEntity = await this.verifyRepository.findById( credentials.phone )

    if ( !foundEntity ) {
      throw new HttpErrors.NotFound( invalidCredentialsError )
    }
    const passwordMatched = await this.passwordHasher.comparePassword(
      credentials.password,
      foundEntity.password,
    )

    if ( !passwordMatched ) {
      throw new HttpErrors.Unauthorized( invalidCredentialsError )
    }

    return foundEntity
  }

  convertToUserProfile ( entity: Verify ) {
    if ( !entity.phone || !entity.password ) {
      throw new HttpErrors.Unauthorized( 'phone/password are null' )
    }

    return { [ securityId ]: entity.userKey! }
  }
}
