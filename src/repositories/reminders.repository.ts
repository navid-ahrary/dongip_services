import { DefaultCrudRepository, repository, BelongsToAccessor, Count } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import _ from 'lodash';
import { Reminders, RemindersRelations, Users } from '../models';
import { MysqlDataSource } from '../datasources';
import { UsersRepository } from './users.repository';

export class RemindersRepository extends DefaultCrudRepository<
  Reminders,
  typeof Reminders.prototype.reminderId,
  RemindersRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Reminders.prototype.reminderId>;

  constructor(
    @inject('datasources.Mysql') dataSource: MysqlDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Reminders, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }

  public async findOverrided(data: {
    notifyTime: string;
    notifyDate: string;
  }): Promise<Array<Reminders>> {
    const cmd = `
      SELECT
        id AS reminderId,
        title,
        \`desc\`,
        period_amount AS periodAmount,
        period_unit AS periodUnit,
        notify_time AS notifyTime,
        previous_notify_date AS previousNotifyDate ,
        next_notify_date AS nextNotifyDate,
        \`repeat\`,
        price,
        user_id AS userId,
        created_at AS createdAt
      FROM
        reminders
      WHERE
        id IN (
        SELECT
          CASE
            WHEN period_unit = 'day' THEN
            CASE
              WHEN TIMESTAMPDIFF(DAY , previous_notify_date, next_notify_date) = period_amount THEN id
            END
            WHEN period_unit = 'week' THEN
            CASE
              WHEN TIMESTAMPDIFF(DAY , previous_notify_date, next_notify_date) / 7 = period_amount THEN id
            END
            WHEN period_unit = 'month' THEN
            CASE
              WHEN TIMESTAMPDIFF(MONTH , previous_notify_date, next_notify_date) = period_amount THEN id
            END
            WHEN period_unit = 'year' THEN
            CASE
              WHEN TIMESTAMPDIFF(YEAR , previous_notify_date, next_notify_date) = period_amount THEN id
            END
          END
        FROM
          dongip.reminders
        WHERE
          notify_time = ?
          AND next_notify_date = ? ) ;`;

    const foundReminders = await this.execute(cmd, [data.notifyTime, data.notifyDate]);

    return _.transform(foundReminders, (result: Array<Reminders>, curr) => {
      result.push(new Reminders(curr));
      return result;
    });
  }

  public async updateOverride(ids: Array<number>): Promise<Count> {
    const cmd = `
      UPDATE
        reminders
      SET
        previous_notify_date = next_notify_date,
        next_notify_date = (
          CASE
          WHEN period_unit = 'day' THEN DATE_ADD(next_notify_date , INTERVAL period_amount DAY)
          WHEN period_unit = 'week' THEN DATE_ADD(next_notify_date , INTERVAL period_amount*7 DAY)
          WHEN period_unit = 'month' THEN DATE_ADD(next_notify_date , INTERVAL period_amount MONTH)
          WHEN period_unit = 'year' THEN DATE_ADD(next_notify_date , INTERVAL period_amount YEAR)
          END )
      WHERE
        id IN (${[...Array(ids.length)].map(() => '?').join(',')}) ;`;

    const result = await this.execute(cmd, [...ids]);
    return { count: +result.changedRows };
  }
}
