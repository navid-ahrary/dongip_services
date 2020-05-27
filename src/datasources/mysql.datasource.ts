import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

import dotenv from 'dotenv';
dotenv.config();

const config = {
  name: 'Mysql',
  connector: 'mysql',
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DBNAME,
};

@lifeCycleObserver('datasource')
export class MysqlDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'Mysql';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.Mysql', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}