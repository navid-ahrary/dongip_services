import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

import dotenv from 'dotenv';
dotenv.config();

const config = {
  name: 'Mysql',
  connector: 'mysql',
  url: '',
  host: 'localhost',
  port: 3306,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: 'dongip_db',
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
