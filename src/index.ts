import {MyApplication} from './application';
import {ApplicationConfig} from '@loopback/core';

export {MyApplication};

export async function main(options: ApplicationConfig = {}) {
  const app = new MyApplication(options);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}/`);
  console.log(`Explorer available at ${url}/openapi`);

  return app;
}
