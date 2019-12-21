import {LoginServiceApplication} from './application';
import {ApplicationConfig} from '@loopback/core';

export {LoginServiceApplication};

export async function main(options: ApplicationConfig = {}) {
  const app = new LoginServiceApplication(options);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}/openapi7823414`);
  console.log(`Explorer available at ${url}/openapi7823414/explorer`);

  return app;
}
