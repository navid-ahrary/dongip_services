import { BindingKey } from '@loopback/context';
import { TokenService, UserService } from '@loopback/authentication';
import { ServiceAccount } from 'firebase-admin';
import dotenv from 'dotenv';
import util from 'util';
import path from 'path';
import { Users, Credentials } from './models';
import { PasswordHasher } from './services';
import {
  CategoriesSource,
  LocalizedMessages,
  PackageInfo,
  SubscriptionSpec,
  TutorialLinks,
  FileUploadHandler,
} from './types';

dotenv.config();

export const pkg: PackageInfo = require('../package.json');
export const PackageKey = BindingKey.create<PackageInfo>('application.package');

export const TutorialLinksListConstants: TutorialLinks = require('../assets/tutorial-links.json');
export const TutorialLinksListBinding = BindingKey.create<TutorialLinks>(
  'application.tutorialLinksList',
);

export const SubsSpecConstants: SubscriptionSpec = require('../assets/subscription-specs.json');
export const SubsSpecBindings = BindingKey.create<SubscriptionSpec>('application.subscriptionSpec');

export const LocMsgsConstants: LocalizedMessages = require('../assets/localized-contents.json');
export const LocMsgsBindings = BindingKey.create<LocalizedMessages>(
  'application.localizedMessages',
);

export const categoriesSourceListConstants: CategoriesSource = require('../assets/categories-source.json');
export const CategoriesSourceListBindings = BindingKey.create<CategoriesSource>(
  'application.categoriesSourceList',
);

export namespace TokenServiceConstants {
  export const ACCESS_SECRET_VALUE = process.env.ACCESS_SECRET!;
  export const VERIFY_EXPIRES_IN_VALUE = process.env.VERIFY_EXPIRES_IN!;
  export const JWT_ALGORITHM_VALUE = process.env.JWT_ALGORITHM!;
  export const ACCESS_EXPIRES_IN_VALUE = process.env.ACCESS_EXPIRES_IN!;
  export const REFRESH_EXPIRES_IN_VALUE = process.env.REFRESH_EXPIRES_IN!;
  export const REFRESH_SECRET_VALUE = process.env.REFRESH_SECRET!;
}

export namespace TokenServiceBindings {
  export const TOKEN_SERVICE = BindingKey.create<TokenService>(
    'services.authentication.jwt.tokenservice',
  );
  export const TOKEN_ALGORITHM = BindingKey.create<string>('authentication.jwt.algorithm');
  export const VERIFY_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.verify.expires.in.seconds',
  );
  export const ACCESS_SECRET = BindingKey.create<string>('authentication.jwt.access.secret');
  export const ACCESS_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.access.expires.in.seconds',
  );
}

export namespace PasswordHasherBindings {
  export const PASSWORD_HASHER = BindingKey.create<PasswordHasher>('services.hasher');
  export const ROUNDS = BindingKey.create<number>('services.hasher.round');
}

export namespace UserServiceBindings {
  export const USER_SERVICE =
    BindingKey.create<UserService<Users, Credentials>>('services.user.service');
}

export namespace RefreshTokenServiceBindings {
  export const REFRESH_SECRET = BindingKey.create<string>('authentication.jwt.refresh.secret');
  export const REFRESH_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.refresh.expires.in.seconds',
  );
}

export const MariadbConfigValue = {
  host: process.env.MARIADB_HOST!,
  port: process.env.MARIADB_PORT!,
  user: process.env.MARIADB_USER!,
  password: process.env.MARIADB_PASSWORD!,
  database: process.env.MARIADB_DATABASE!,
};
export const MariadbConfigBinding = BindingKey.create<object>('datasources.config.Mariadb');

export namespace FirebaseConstants {
  export const FIREBASE_APPLICATION_DATABASEURL_VALIE =
    process.env.FIREBASE_APPLICATION_DATABASEURL!;

  export const FIREBASE_DONGIP_USER_APP_NAME_VALUE = process.env.FIREBASE_DONGIP_USER_APP_NAME!;
  export const FIREBASE_DONGIP_SUPPORT_APP_NAME_VALUE =
    process.env.FIREBASE_DONGIP_SUPPORT_APP_NAME!;

  // User app scope
  export const FIREBASE_DONGIP_USER_CERT_FILE = require(path.join(
    path.resolve(),
    'assets',
    'dongip-user-firebase-adminsdk.json',
  ));

  // Support app scope
  export const FIREBASE_DONGIP_SUPPORT_CERT_FILE = require(path.join(
    path.resolve(),
    'assets',
    'dongip-support-firebase-adminsdk.json',
  ));
}

export namespace FirebaseBinding {
  export const FIREBASE_APPLICATION_DATABASEURL = BindingKey.create<string>(
    'services.firebase.databaseUrl',
  );
  export const FIREBASE_DONGIP_USER_APP_NAME = BindingKey.create<string>(
    'services.firebase.user.appname',
  );
  export const FIREBASE_DONGIP_SUPPORT_APP_NAME = BindingKey.create<string>(
    'services.firebase.support.appname',
  );
  export const FIREBASE_DONGIP_USER_CERT =
    BindingKey.create<ServiceAccount>('services.firebase.user');
  export const FIREBASE_DONGIP_SUPPORT_CERT = BindingKey.create<ServiceAccount>(
    'services.firebase.support',
  );
}

export namespace KavenegarConstans {
  export const KAVENEGAR_API_KEY_VALUE = process.env.KAVENEGAR_API_KEY!;
  export const SMS_TEMPLATE_FA_VALUE = process.env.SMS_TEMPLATE_FA!;
  export const SMS_TEMPLATE_EN_VALUE = process.env.SMS_TEMPLATE_EN!;
  export const SMS_SURVEY_TEMPLATE_VALUE = process.env.SMS_SURVEY_TEMPLATE!;
}

export namespace KavenegarBindings {
  export const KAVENEGAR_API_KEY = BindingKey.create<string>('services.kavenegar.apiKey');
  export const SMS_TEMPLATE_FA = BindingKey.create<string>('services.kavenegar.smsTemplateFa');
  export const SMS_TEMPLATE_EN = BindingKey.create<string>('services.kavenegar.smsTemplateEn');
  export const SMS_SURVEY_TEMPLATE = BindingKey.create<string>('services.kavenegar.surveyTemplate');
}

export namespace CafebazaarConstants {
  export const CAFEBAZAAR_PACKAGE_NAME_VALUE = process.env.CAFEBAZAAR_PACKAGE_NAME!;
  export const CAFEBAZAAR_REFRESH_TOKEN_VALUE = process.env.CAFEBAZAAR_REFRESH_TOKEN!;
  export const CAFEBAZAAR_CLIENT_ID_VALUE = process.env.CAFEBAZAAR_CLIENT_ID!;
  export const CAFEBAZAAR_CLIENT_SECRET_VALUE = process.env.CAFEBAZAAR_CLIENT_SECRET!;
  export const CAFEBAZAAR_API_BASEURL_VALUE = process.env.CAFEBAZAAR_API_BASEURL!;
}

export namespace CafebazaarBindings {
  export const CAFEBAZAAR_PACKAGE_NAME = BindingKey.create<string>(
    'services.cafebazaar.packageName',
  );
  export const CAFEBAZAAR_REFRESH_TOKEN = BindingKey.create<string>(
    'services.cafebazaar.refreshToken',
  );
  export const CAFEBAZAAR_CLIENT_ID = BindingKey.create<string>('services.cafebazaar.clientId');
  export const CAFEBAZAAR_CLIENT_SECRET = BindingKey.create<string>(
    'services.cafebazaar.clientSecret',
  );
  export const CAFEBAZAAR_API_BASEURL = BindingKey.create<string>('services.cafebazaar.apiBaseUrl');
}

export namespace EmailConstants {
  export const ZOHO_ACCOUNT_SCOPE_URL_VALUE = process.env.ZOHO_ACCOUNT_SCOPE_URL!;
  export const SUPPORT_EMAIL_ADDRESS_VALUE = process.env.ZOHO_SUPPORT_MAIL_ADDRESS!;
  export const SUPPORT_REFRESH_TOKEN_VALUE = process.env.ZOHO_SUPPRT_ACCOUNT_REFRESH_TOKEN!;
  export const SUPPORT_CLIENT_ID_VALUE = process.env.ZOHO_SUPPORT_ACCOUNT_CLIENT_ID!;
  export const SUPPORT_CLIENT_SECRET_VALUE = process.env.ZOHO_SUPPORT_ACCOUNT_CLIENT_SECRET!;
  export const SUPPORT_MESSAGE_URL_VALUE = util.format(
    process.env.ZOHO_MESSAGE_SCOPE_URL!,
    process.env.ZOHO_SUPPORT_ACCOUNT_ID!,
  );
  export const NOREPLY_MAIL_ADDRESS_VALUE = process.env.ZOHO_NOREPLY_MAIL_ADDRESS!;
  export const GMAIL_ACCOUNT_VALUE = process.env.GMAIL_ACCOUNT!;
}

export namespace EmailBindings {
  export const ZOHO_ACCOUNT_SCOPE_URL = BindingKey.create<string>(
    'services.email.zoho.accountScopeUrl',
  );
  export const GMAIL_ACCOUNT = BindingKey.create<string>('services.email.gmail.address');
  export const SUPPORT_EMAIL_ADDRESS = BindingKey.create<string>(
    'services.email.zoho.support.address',
  );
  export const SUPPORT_REFRESH_TOKEN = BindingKey.create<string>(
    'services.email.zoho.support.refreshToken',
  );
  export const SUPPORT_CLIENT_ID = BindingKey.create<string>(
    'services.email.zoho.support.clientId',
  );
  export const SUPPORT_CLIENT_SECRET = BindingKey.create<string>(
    'services.email.zoho.support.clientSecret',
  );
  export const SUPPORT_MESSAGE_URL = BindingKey.create<string>(
    'services.email.zoho.support.messageUrl',
  );
  export const NOREPLY_MAIL_ADDRESS = BindingKey.create<string>(
    'services.email.zoho.noreply.address',
  );
}

export const tzValue = process.env.TZ!;
export const TzBindings = BindingKey.create<string>('application.config.tz');

export const appInstance = process.env.NODE_APP_INSTANCE ?? '0';
export const AppInstanceBinding = BindingKey.create<string>('application.appInstance');

export const hostname = process.env.HOSTNAME!;
export const HostnameBinding = BindingKey.create<string>('hostname');

export namespace WoocommerceConstants {
  export const WOOCOMMERCE_CONSUMER_KEY_VALUE = process.env.WOOCOMMERCE_CONSUMER_KEY!;
  export const WOOCOMMERCE_CONSUMER_SECRET_VALUE = process.env.WOOCOMMERCE_CONSUMER_SECRET!;
}

export namespace WoocommerceBindings {
  export const WOOCOMMERCE_CONSUMER_KEY = BindingKey.create<string>(
    'services.woocommerce.consumerKey',
  );
  export const WOOCOMMERCE_CONSUMER_SECRET = BindingKey.create<string>(
    'services.woocommerce.consumerSecret',
  );
}

/**
 * Binding key for the file upload service
 */
export const FILE_UPLOAD_SERVICE = BindingKey.create<FileUploadHandler>('services.FileUpload');

/**
 * Binding key for the storage directory
 */
export const STORAGE_DIRECTORY_VALUE = process.env.STORAGE_DIRECTORY!;
export const STORAGE_DIRECTORY_BINDING = BindingKey.create<string>('services.storage.directory');

export namespace AppVersionConstants {
  export const ANDROID_VERSION_VALUE = process.env.ANDROID_VERSION!;
  export const IOS_VERSION_VALUE = process.env.IOS_VERSION!;
}

export namespace AppVersionBindings {
  export const ANDROID_VERSION = BindingKey.create<string>('application.androidversion');
  export const IOS_VERSION = BindingKey.create<string>('application.iosVersion');
}
