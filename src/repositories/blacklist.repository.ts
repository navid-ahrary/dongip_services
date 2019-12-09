import {DefaultKeyValueRepository} from '@loopback/repository';
import {Blacklist} from '../models';
import {RedisDataSource} from '../datasources';
import {inject} from '@loopback/core';
import {} from 'module';
import {promisify} from 'util';
import {HttpErrors} from '@loopback/rest';

export class BlacklistRepository extends DefaultKeyValueRepository<Blacklist> {
  constructor(@inject('datasources.redisds') dataSource: RedisDataSource) {
    super(Blacklist, dataSource);
  }

  execute = promisify(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (command: string, args: any[], callback: Function) => {
      // eslint-disable-next-line no-invalid-this
      const connector = this.kvModelClass.dataSource!.connector!;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      connector.execute!(command, args, callback);
    },
  );

  async addTokenToBlacklist(userId: string, token: string) {
    const result = await this.execute('SADD', [userId, token]);
    return result;
  }

  async checkTokenInBlacklist(userId: string, token: string) {
    const result = await this.execute('SISMEMBER', [userId, token]);

    if (result) {
      throw new Error('This token is blacklisted');
    }
    return;
  }
}
