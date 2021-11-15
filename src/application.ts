import { AuthenticationComponent, registerAuthenticationStrategy } from '@loopback/authentication';
import { JWTAuthenticationComponent, SECURITY_SCHEME_SPEC } from '@loopback/authentication-jwt';
import {
  AuthorizationBindings,
  AuthorizationComponent,
  AuthorizationDecision,
  AuthorizationOptions,
} from '@loopback/authorization';
import { BootMixin } from '@loopback/boot';
import { ApplicationConfig, createBindingFromClass } from '@loopback/core';
import { CronComponent } from '@loopback/cron';
import { HealthBindings, HealthComponent } from '@loopback/extension-health';
import { format, LoggingBindings, LoggingComponent } from '@loopback/logging';
import { RepositoryMixin } from '@loopback/repository';
import { RestApplication } from '@loopback/rest';
import { RestExplorerBindings, RestExplorerComponent } from '@loopback/rest-explorer';
import { ServiceMixin } from '@loopback/service-proxy';
import moment from 'moment';
import path from 'path';
import {
  appInstance,
  AppInstanceBinding,
  AppVersionBindings,
  AppVersionConstants,
  CafebazaarBindings,
  CafebazaarConstants,
  CategoriesSourceListBindings,
  categoriesSourceListConstants,
  EmailBindings,
  EmailConstants,
  FirebaseBinding,
  FirebaseConstants,
  hostname,
  HostnameBinding,
  KavenegarBindings,
  KavenegarConstans,
  LocMsgsBindings,
  LocMsgsConstants,
  MariadbConfigBinding,
  MariadbConfigValue,
  PackageKey,
  pkg,
  RefreshTokenServiceBindings,
  STORAGE_DIRECTORY_BINDING,
  STORAGE_DIRECTORY_VALUE,
  SubsSpecBindings,
  SubsSpecConstants,
  TokenServiceBindings,
  TokenServiceConstants,
  TutorialLinksListBinding,
  TutorialLinksListConstants,
  TzBindings,
  tzValue,
  UserServiceBindings,
  WoocommerceBindings,
  WoocommerceConstants,
} from './keys';
import { MySequence } from './sequence';
import {
  DailyScheduleConjobService,
  JWTAccessAutenticationStrategy,
  JWTService,
  JWTVerifyAutenticationStrategy,
  MyUserService,
  ReminderCronjobService,
} from './services';

export { ApplicationConfig };

export class DongipApplication extends BootMixin(ServiceMixin(RepositoryMixin(RestApplication))) {
  constructor(
    options: ApplicationConfig = {
      shutdown: { signals: ['SIGTERM'], gracePeriod: 1000 },
    },
  ) {
    super(options);

    this.sequence(MySequence);

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

    this.setupBinding();

    // this.component(MetricsComponent);
    this.component(HealthComponent);

    // Add cronjob services
    this.component(CronComponent);
    this.add(createBindingFromClass(DailyScheduleConjobService));
    this.add(createBindingFromClass(ReminderCronjobService));

    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });

    // Configure metric component
    // this.configure(MetricsBindings.COMPONENT).to({
    //   endpoint: { basePath: '/metrics', disabled: false },
    //   defaultMetrics: { timeout: 10000, disabled: false },
    // });

    // Configure health checking configuration
    this.configure(HealthBindings.COMPONENT).to({
      disabled: false,
      healthPath: '/health',
      readyPath: '/ready',
      livePath: '/live',
    });

    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    this.bootOptions = {
      controllers: {
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };

    this.configureLogging();

    this.component(AuthenticationComponent);
    this.component(JWTAuthenticationComponent);

    registerAuthenticationStrategy(this, JWTVerifyAutenticationStrategy);
    registerAuthenticationStrategy(this, JWTAccessAutenticationStrategy);

    this.setupAuthBindingKeys();

    const authoriazationOptions: AuthorizationOptions = {
      precedence: AuthorizationDecision.DENY,
      defaultDecision: AuthorizationDecision.DENY,
    };
    this.configure(AuthorizationBindings.COMPONENT).to(authoriazationOptions);

    this.component(AuthorizationComponent);
  }

  setupAuthBindingKeys() {
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

    this.bind(UserServiceBindings.USER_SERVICE).toClass(MyUserService);
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
    this.bind(KavenegarBindings.SMS_SURVEY_TEMPLATE).to(
      KavenegarConstans.SMS_SURVEY_TEMPLATE_VALUE,
    );

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

    this.bind(AppVersionBindings.ANDROID_VERSION).to(AppVersionConstants.ANDROID_VERSION_VALUE);
    this.bind(AppVersionBindings.IOS_VERSION).to(AppVersionConstants.IOS_VERSION_VALUE);
  }

  configureLogging() {
    this.configure(LoggingBindings.COMPONENT).to({
      enableFluent: false, // default to true
      enableHttpAccessLog: true, // default to true
    });

    const myFormat = format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    });

    this.configure(LoggingBindings.WINSTON_LOGGER).to({
      format: format.combine(
        format.colorize({ colors: { error: 'red', info: 'blue' }, all: true }),
        format.timestamp({ format: () => moment().format('YYYY-MM-DD HH:mm:ssZ') }),
        myFormat,
      ),
      defaultMeta: { framework: 'LoopBack' },
    });

    this.configure(LoggingBindings.WINSTON_HTTP_ACCESS_LOGGER).to({
      format: ':remote-addr - :remote-user :method :url :status ":user-agent" - :response-time ms',
    });

    this.component(LoggingComponent);
  }
}
