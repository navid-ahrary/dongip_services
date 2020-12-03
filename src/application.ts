import { BootMixin } from '@loopback/boot';
import { ApplicationConfig, BindingKey, createBindingFromClass } from '@loopback/core';
import { RestExplorerBindings, RestExplorerComponent } from '@loopback/rest-explorer';
import { RepositoryMixin } from '@loopback/repository';
import { RestApplication } from '@loopback/rest';
import { ServiceMixin } from '@loopback/service-proxy';
import { registerAuthenticationStrategy } from '@loopback/authentication';
import {
  AuthorizationDecision,
  AuthorizationOptions,
  AuthorizationComponent,
  AuthorizationBindings,
} from '@loopback/authorization';
import { SECURITY_SCHEME_SPEC } from '@loopback/authentication-jwt';
import { MetricsComponent, MetricsBindings } from '@loopback/extension-metrics';
import { HealthComponent, HealthBindings } from '@loopback/extension-health';
import { CronComponent } from '@loopback/cron';
import path from 'path';
import dotenv from 'dotenv';

import { MyAuthenticationSequence } from './sequence';
import { UserAuthenticationComponent } from './components/user.authentication';
import {
  JWTVerifyAutehticationStrategy,
  JWTAccessAutehticationStrategy,
  JWTRefreshAutehticationStrategy,
} from './authentication-strategies/jwt-strategies';
import {
  TokenServiceBindings,
  TokenServiceConstants,
  PasswordHasherBindings,
  UserServiceBindings,
} from './keys';
import { JWTService, BcryptHasher, MyUserService, CronJobService } from './services';

/**
 * Information from package.json
 */
export interface PackageInfo {
  name: string;
  version: string;
  description: string;
}
export const PackageKey = BindingKey.create<PackageInfo>('application.package');

const pkg: PackageInfo = require('../package.json');

/**
 * Subscription specs from subscriotion-scpecs.json
 */
export interface SubscriptionSpec {
  baseCallbackUrl: string;
  plans: {
    [planId: string]: {
      id: string;
      name: string;
      grade: string;
      duration: { unit: 'month' | 'months' | 'year'; amount: number };
      regular: { [currency: string]: number };
      sale: { [currency: string]: number };
      onSale: boolean;
    };
  };
}
export const SubscriptionSpec = BindingKey.create<SubscriptionSpec>('application.subscriptionSpec');
const subsSpec: SubscriptionSpec = require('../assets/subscription-specs.json');

export interface LocalizedMessages {
  [key: string]: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [language: string]: any;
  };
}
export const LocalizedMessages = BindingKey.create<LocalizedMessages>(
  'application.localizedMessages',
);
const localizedMessages: LocalizedMessages = require('../locale/localized-contents.json');

export interface CategoriesSource {
  [language: string]: Array<{ id: number; title: string; icon: string }>;
}

export const CategoriesSourceList = BindingKey.create<CategoriesSource>(
  'application.categoriesSourceList',
);
const categoriesSourceList: CategoriesSource = require('../assets/categories-source.json');

export class MyApplication extends BootMixin(ServiceMixin(RepositoryMixin(RestApplication))) {
  hashRound: number;

  constructor(
    options: ApplicationConfig = {
      shutdown: { signals: ['SIGTERM'], gracePeriod: 1000 },
    },
  ) {
    dotenv.config();

    super(options);

    this.api({
      openapi: '3.0.0',
      info: {
        title: pkg.name,
        version: pkg.version,
        description: 'API Gateway',
        contact: {
          name: 'Dongip Team',
          email: 'info@dongip.ir',
          url: 'https://www.dongip.ir/about-us',
        },
      },
      paths: {},
      components: {
        securitySchemes: SECURITY_SCHEME_SPEC,
      },
      servers: [{ url: '/', description: 'API Gateway' }],
    });

    this.hashRound = +process.env.HASH_ROUND!;

    this.setupBinding();

    // Bind authentication components related elemets
    this.component(UserAuthenticationComponent);

    const authoriazationOptions: AuthorizationOptions = {
      precedence: AuthorizationDecision.DENY,
      defaultDecision: AuthorizationDecision.DENY,
    };
    this.configure(AuthorizationBindings.COMPONENT).to(authoriazationOptions);
    this.component(AuthorizationComponent);

    registerAuthenticationStrategy(this, JWTAccessAutehticationStrategy);
    registerAuthenticationStrategy(this, JWTRefreshAutehticationStrategy);
    registerAuthenticationStrategy(this, JWTVerifyAutehticationStrategy);

    // Set up the custom sequence
    this.sequence(MyAuthenticationSequence);

    this.component(MetricsComponent);

    this.component(HealthComponent);

    this.component(CronComponent);
    this.add(createBindingFromClass(CronJobService));

    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.bind(RestExplorerBindings.CONFIG).to({
      path: '/explorer',
    });

    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  setupBinding(): void {
    // Configure metric component
    this.configure(MetricsBindings.COMPONENT).to({
      endpoint: { basePath: '/metrics', disabled: false },
      defaultMetrics: { timeout: 10000, disabled: false },
    });

    // Configure health checking configuration
    this.configure(HealthBindings.COMPONENT).to({
      disabled: false,
      healthPath: '/health',
      readyPath: '/ready',
      livePath: '/live',
    });

    // Bind package.json to the application context
    this.bind(PackageKey).to(pkg);

    // Bind subscription specs to the context
    this.bind(SubscriptionSpec).to(subsSpec);

    // Bind locale messages
    this.bind(LocalizedMessages).to(localizedMessages);

    // Bind categories source lists
    this.bind(CategoriesSourceList).to(categoriesSourceList);

    this.bind(TokenServiceBindings.TOKEN_SECRET).to(TokenServiceConstants.TOKEN_SECRET_VALUE!);
    this.bind(TokenServiceBindings.TOKEN_ALGORITHM).to(TokenServiceConstants.JWT_TOKEN_ALGORITHM);
    this.bind(TokenServiceBindings.VERIFY_TOKEN_EXPIRES_IN).to(
      TokenServiceConstants.VERIFY_TOKEN_EXPIRES_IN_VALUE,
    );
    this.bind(TokenServiceBindings.ACCESS_TOKEN_EXPIRES_IN).to(
      TokenServiceConstants.ACCESS_TOKEN_EXPIRES_IN_VALUE,
    );
    this.bind(TokenServiceBindings.REFRESH_TOKEN_EXPIRES_IN).to(
      TokenServiceConstants.REFRESH_TOKEN_EXPIRES_IN_VALUE,
    );
    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);

    // Bind bcrypt hash service
    this.bind(PasswordHasherBindings.ROUNDS).to(this.hashRound);
    this.bind(PasswordHasherBindings.PASSWORD_HASHER).toClass(BcryptHasher);

    this.bind(UserServiceBindings.USER_SERVICE).toClass(MyUserService);
  }
}
