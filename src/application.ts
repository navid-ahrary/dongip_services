import { BootMixin } from '@loopback/boot'
import { ApplicationConfig, BindingKey } from '@loopback/core'
import {
  RestExplorerBindings,
  RestExplorerComponent
} from '@loopback/rest-explorer'
import { RepositoryMixin } from '@loopback/repository'
import { RestApplication } from '@loopback/rest'
import { ServiceMixin } from '@loopback/service-proxy'
import { registerAuthenticationStrategy } from '@loopback/authentication'
import * as path from 'path'

import { MyAuthenticationSequence } from './sequence'
import { UserAuthenticationComponent } from './components/user.authentication'
import {
  JWTVerifyAutehticationStrategy,
  JWTAccessAutehticationStrategy,
  JWTRefreshAutehticationStrategy,
} from './authentication-strategies/jwt-strategies'
import {
  TokenServiceBindings,
  TokenServiceConstants,
  PasswordHasherBindings,
  UserServiceBindings,
} from './keys'
import { JWTService, BcryptHasher, MyUserService } from './services'
import { SECURITY_SCHEME_SPEC } from './utils/security-specs'


/**
 * Information from package.json
 */
export interface PackageInfo {
  name: string
  version: string
  description: string
}
export const PackageKey = BindingKey.create<PackageInfo>( 'application.package' )

const pkg: PackageInfo = require( '../package.json' )

export class MyApplication extends BootMixin(
  ServiceMixin( RepositoryMixin( RestApplication ) ),
) {
  constructor ( options: ApplicationConfig = {} ) {
    super( options )

    this.hashRound = Number( process.env.HASH_ROUND )

    this.api( {
      openapi: '3.0.0',
      info: { title: pkg.name, version: pkg.version },
      paths: {},
      components: { securitySchemes: SECURITY_SCHEME_SPEC },
      servers: [ { url: '/' } ],
    } )

    this.setupBinding()

    //Bind authentication components related elemets
    this.component( UserAuthenticationComponent )

    registerAuthenticationStrategy( this, JWTAccessAutehticationStrategy )
    registerAuthenticationStrategy( this, JWTRefreshAutehticationStrategy )
    registerAuthenticationStrategy( this, JWTVerifyAutehticationStrategy )

    // Set up the custom sequence
    this.sequence( MyAuthenticationSequence )

    // Set up default home page
    this.static( '/', path.join( __dirname, '../public' ) )
    // Customize @loopback/rest-explorer configuration here
    this.bind( RestExplorerBindings.CONFIG ).to( {
      path: '/openapi7823414/explorer',
    } )
    this.component( RestExplorerComponent )

    this.projectRoot = __dirname
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: [ 'controllers' ],
        extensions: [ '.controller.js' ],
        nested: true,
      },
    }

  }


  setupBinding (): void {
    // Bind package.json to the application context
    this.bind( PackageKey ).to( pkg )

    this.bind( TokenServiceBindings.TOKEN_SECRET ).to(
      TokenServiceConstants.TOKEN_SECRET_VALUE!,
    )
    this.bind( TokenServiceBindings.VERIFY_TOKEN_EXPIRES_IN ).to(
      TokenServiceConstants.VERIFY_TOKEN_EXPIRES_IN_VALUE!,
    )
    this.bind( TokenServiceBindings.ACCESS_TOKEN_EXPIRES_IN ).to(
      TokenServiceConstants.ACCESS_TOKEN_EXPIRES_IN_VALUE!,
    )
    this.bind( TokenServiceBindings.REFRESH_TOKEN_EXPIRES_IN ).to(
      TokenServiceConstants.REFRESH_TOKEN_EXPIRES_IN_VALUE!,
    )
    this.bind( TokenServiceBindings.TOKEN_SERVICE ).toClass( JWTService )

    // Bind bcrypt hash service
    this.bind( PasswordHasherBindings.ROUNDS ).to( this.hashRound )
    this.bind( PasswordHasherBindings.PASSWORD_HASHER ).toClass( BcryptHasher )

    this.bind( UserServiceBindings.USER_SERVICE ).toClass( MyUserService )
  }
}
