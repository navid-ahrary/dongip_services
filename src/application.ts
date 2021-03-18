import { BootMixin } from '@loopback/boot';
import { ApplicationConfig, createBindingFromClass } from '@loopback/core';
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
import { RefreshTokenServiceBindings, SECURITY_SCHEME_SPEC } from '@loopback/authentication-jwt';
import { MetricsComponent, MetricsBindings } from '@loopback/extension-metrics';
import { HealthComponent, HealthBindings } from '@loopback/extension-health';
import { CronComponent } from '@loopback/cron';
import Path from 'path';
import { MyAuthenticationSequence } from './sequence';
import { UserAuthenticationComponent } from './components';
import {
  JWTService,
  BcryptHasher,
  MyUserService,
  DailyScheduleConjobService,
  ReminderCronjobService,
  JWTVerifyAutenticationStrategy,
  JWTAccessAutenticationStrategy,
} from './services';
import {
  pkg,
  PackageKey,
  SubsSpecBindings,
  SubsSpecConstants,
  LocMsgsBindings,
  LocMsgsConstants,
  TutorialLinksListBinding,
  PasswordHasherBindings,
  FirebaseBinding,
  FirebaseConstants,
  KavenegarBindings,
  KavenegarConstans,
  CafebazaarBindings,
  CafebazaarConstants,
  EmailBindings,
  EmailConstants,
  TokenServiceBindings,
  TokenServiceConstants,
  CategoriesSourceListBindings,
  categoriesSourceListConstants,
  UserServiceBindings,
  TutorialLinksListConstants,
  TzBindings,
  tzValue,
  MariadbConfigBinding,
  MariadbConfigValue,
  appInstance,
  hostname,
  HostnameBinding,
  AppInstanceBinding,
  WoocommerceBindings,
  WoocommerceConstants,
  STORAGE_DIRECTORY_BINDING,
  STORAGE_DIRECTORY_VALUE,
} from './keys';

export { ApplicationConfig };

export class DongipApplication extends BootMixin(ServiceMixin(RepositoryMixin(RestApplication))) {
  hashRound: number;

  constructor(
    options: ApplicationConfig = {
      shutdown: { signals: ['SIGTERM'], gracePeriod: 1000 },
    },
  ) {
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

    registerAuthenticationStrategy(this, JWTVerifyAutenticationStrategy);
    registerAuthenticationStrategy(this, JWTAccessAutenticationStrategy);

    // Set up the custom sequence
    this.sequence(MyAuthenticationSequence);

    this.component(MetricsComponent);
    this.component(HealthComponent);

    // Add cronjob services
    this.component(CronComponent);
    this.add(createBindingFromClass(DailyScheduleConjobService));
    this.add(createBindingFromClass(ReminderCronjobService));

    this.static('/', Path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });

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
    // Bind package.json to the application context
    this.bind(PackageKey).to(pkg);

    this.bind(SubsSpecBindings).to(SubsSpecConstants);

    this.bind(LocMsgsBindings).to(LocMsgsConstants);

    this.bind(CategoriesSourceListBindings).to(categoriesSourceListConstants);

    this.bind(TutorialLinksListBinding).to(TutorialLinksListConstants);

    this.bind(TzBindings).to(tzValue);

    this.bind(AppInstanceBinding).to(appInstance);

    this.bind(HostnameBinding).to(hostname);

    // Bind MariaDB datasource configs
    this.bind(MariadbConfigBinding).to(MariadbConfigValue);

    // Bind JWT constants
    this.bind(TokenServiceBindings.TOKEN_ALGORITHM).to(TokenServiceConstants.JWT_ALGORITHM_VALUE);
    this.bind(TokenServiceBindings.ACCESS_SECRET).to(TokenServiceConstants.ACCESS_SECRET_VALUE);
    this.bind(TokenServiceBindings.ACCESS_EXPIRES_IN).to(
      TokenServiceConstants.ACCESS_EXPIRES_IN_VALUE,
    );
    this.bind(TokenServiceBindings.VERIFY_EXPIRES_IN).to(
      TokenServiceConstants.VERIFY_EXPIRES_IN_VALUE,
    );
    this.bind(RefreshTokenServiceBindings.REFRESH_SECRET).to(
      TokenServiceConstants.REFRESH_SECRET_VALUE,
    );
    this.bind(RefreshTokenServiceBindings.REFRESH_EXPIRES_IN).to(
      TokenServiceConstants.REFRESH_EXPIRES_IN_VALUE,
    );
    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);

    // Bind bcrypt hash service
    this.bind(PasswordHasherBindings.ROUNDS).to(this.hashRound);
    this.bind(PasswordHasherBindings.PASSWORD_HASHER).toClass(BcryptHasher);

    this.bind(UserServiceBindings.USER_SERVICE).toClass(MyUserService);

    // Bind firebase constants
    this.bind(FirebaseBinding.FIREBASE_APPLICATION_DATABASEURL).to(
      FirebaseConstants.FIREBASE_APPLICATION_DATABASEURL_VALIE,
    );
    this.bind(FirebaseBinding.FIREBASE_DONGIP_USER_APP_NAME).to(
      FirebaseConstants.FIREBASE_DONGIP_USER_APP_NAME_VALUE,
    );
    this.bind(FirebaseBinding.FIREBASE_DONGIP_SUPPORT_APP_NAME).to(
      FirebaseConstants.FIREBASE_DONGIP_SUPPORT_APP_NAME_VALUE,
    );
    this.bind(FirebaseBinding.FIREBASE_DONGIP_USER_CERT).to(
      FirebaseConstants.FIREBASE_DONGIP_USER_CERT_FILE,
    );
    // Firebase Support app binding constants
    this.bind(FirebaseBinding.FIREBASE_DONGIP_SUPPORT_CERT).to(
      FirebaseConstants.FIREBASE_DONGIP_SUPPORT_CERT_FILE,
    );

    // Bind Kavenegar constants
    this.bind(KavenegarBindings.KAVENEGAR_API_KEY).to(KavenegarConstans.KAVENEGAR_API_KEY_VALUE);
    this.bind(KavenegarBindings.SMS_TEMPLATE_FA).to(KavenegarConstans.SMS_TEMPLATE_FA_VALUE);
    this.bind(KavenegarBindings.SMS_TEMPLATE_EN).to(KavenegarConstans.SMS_TEMPLATE_EN_VALUE);

    // Bind Cafebazaar constants
    this.bind(CafebazaarBindings.CAFEBAZAAR_API_BASEURL).to(
      CafebazaarConstants.CAFEBAZAAR_API_BASEURL_VALUE,
    );
    this.bind(CafebazaarBindings.CAFEBAZAAR_CLIENT_ID).to(
      CafebazaarConstants.CAFEBAZAAR_CLIENT_ID_VALUE,
    );
    this.bind(CafebazaarBindings.CAFEBAZAAR_CLIENT_SECRET).to(
      CafebazaarConstants.CAFEBAZAAR_CLIENT_SECRET_VALUE,
    );
    this.bind(CafebazaarBindings.CAFEBAZAAR_PACKAGE_NAME).to(
      CafebazaarConstants.CAFEBAZAAR_PACKAGE_NAME_VALUE,
    );
    this.bind(CafebazaarBindings.CAFEBAZAAR_REFRESH_TOKEN).to(
      CafebazaarConstants.CAFEBAZAAR_REFRESH_TOKEN_VALUE,
    );

    // Bind Email service constants
    this.bind(EmailBindings.ZOHO_ACCOUNT_SCOPE_URL).to(EmailConstants.ZOHO_ACCOUNT_SCOPE_URL_VALUE);
    this.bind(EmailBindings.GMAIL_ACCOUNT).to(EmailConstants.GMAIL_ACCOUNT_VALUE);
    this.bind(EmailBindings.NOREPLY_MAIL_ADDRESS).to(EmailConstants.NOREPLY_MAIL_ADDRESS_VALUE);
    this.bind(EmailBindings.SUPPORT_CLIENT_ID).to(EmailConstants.SUPPORT_CLIENT_ID_VALUE);
    this.bind(EmailBindings.SUPPORT_CLIENT_SECRET).to(EmailConstants.SUPPORT_CLIENT_SECRET_VALUE);
    this.bind(EmailBindings.SUPPORT_EMAIL_ADDRESS).to(EmailConstants.SUPPORT_EMAIL_ADDRESS_VALUE);
    this.bind(EmailBindings.SUPPORT_MESSAGE_URL).to(EmailConstants.SUPPORT_MESSAGE_URL_VALUE);
    this.bind(EmailBindings.SUPPORT_REFRESH_TOKEN).to(EmailConstants.SUPPORT_REFRESH_TOKEN_VALUE);

    // Bind Woocommerce
    this.bind(WoocommerceBindings.WOOCOMMERCE_CONSUMER_KEY).to(
      WoocommerceConstants.WOOCOMMERCE_CONSUMER_KEY_VALUE,
    );
    this.bind(WoocommerceBindings.WOOCOMMERCE_CONSUMER_SECRET).to(
      WoocommerceConstants.WOOCOMMERCE_CONSUMER_SECRET_VALUE,
    );

    // Bind Storage directory
    this.bind(STORAGE_DIRECTORY_BINDING).to(STORAGE_DIRECTORY_VALUE);
  }
}
