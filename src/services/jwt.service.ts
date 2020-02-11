/* eslint-disable prefer-const */
import { TokenService } from '@loopback/authentication'
import { promisify } from 'util'
import { TokenServiceBindings } from '../keys'
import { inject } from '@loopback/core'
import { UserProfile, securityId } from '@loopback/security'
import { HttpErrors } from '@loopback/rest'
import { repository } from '@loopback/repository'
import { UsersRepository, BlacklistRepository } from '../repositories'

const jwt = require( 'jsonwebtoken' )
const signAsync = promisify( jwt.sign )
const verifyAsync = promisify( jwt.verify )

export class JWTService implements TokenService {
  constructor (
    @repository( UsersRepository ) public usersRepository: UsersRepository,
    @repository( BlacklistRepository ) public blacklistRepository: BlacklistRepository,
    @inject( TokenServiceBindings.TOKEN_SECRET ) private jwtSecret: string,
    @inject( TokenServiceBindings.TOKEN_EXPIRES_IN ) private jwtExpiresIn: string,
    @inject( TokenServiceBindings.TOKEN_ALGORITHM ) private jwtAlgorithm: string,
  ) { }

  async verifyToken ( accessToken: string ): Promise<UserProfile> {
    if ( !accessToken ) {
      throw new HttpErrors.Unauthorized(
        `Error verifying access token: 'token' is null` )
    }

    let userProfile: UserProfile

    try {
      //decode user profile from token
      const decryptedToken = await verifyAsync( accessToken, this.jwtSecret )
      // don't copy over token field 'iat' and 'exp', nor 'email'
      delete decryptedToken.email
      delete decryptedToken.iat
      delete decryptedToken.exp

      // check token is not in blacklist
      await this.blacklistRepository.checkTokenNotBlacklisted(
        {
          where: { _key: accessToken }
        }
      )

      userProfile = Object.assign( {}, decryptedToken )
    } catch ( error ) {
      throw new HttpErrors.Unauthorized(
        `Error verifying access token: ${ error.message }` )
    }
    return userProfile
  }

  async generateToken ( userProfile: UserProfile ): Promise<string> {
    if ( !userProfile ) {
      throw new HttpErrors.Unauthorized(
        'Error generating token, userPofile is null.' )
    }
    let expiresIn,
      subject = userProfile[ securityId ]

    switch ( userProfile[ 'type' ] ) {
      case 'verify' || 'refresh':
        expiresIn = +userProfile.expiresIn
        delete userProfile.expiresIn
        break
      case 'access':
        expiresIn = +this.jwtExpiresIn
        break
    }

    //generate a JWT token
    let accessToken: string
    try {
      accessToken = signAsync( userProfile, this.jwtSecret, {
        algorithm: this.jwtAlgorithm,
        expiresIn: expiresIn,
        subject: subject
      } )
    } catch ( error ) {
      throw new HttpErrors.Unauthorized(
        `Error generating token: ${ error.message }` )
    }
    return accessToken
  }
}
