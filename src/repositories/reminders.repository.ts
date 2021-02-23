import { DefaultCrudRepository, repository, BelongsToAccessor, Count } from '@loopback/repository';
import { inject, Getter } from '@loopback/core';
import _ from 'lodash';
import { Reminders, RemindersRelations, Users } from '../models';
import { MariadbDataSource } from '../datasources';
import { UsersRepository } from '.';

export type Find = { notifyTime: string; nextNotifyDate: string };

export class RemindersRepository extends DefaultCrudRepository<
  Reminders,
  typeof Reminders.prototype.reminderId,
  RemindersRelations
> {
  public readonly user: BelongsToAccessor<Users, typeof Reminders.prototype.reminderId>;

  constructor(
    @inject('datasources.Mariadb') dataSource: MariadbDataSource,
    @repository.getter('UsersRepository') protected usersRepositoryGetter: Getter<UsersRepository>,
  ) {
    super(Reminders, dataSource);

    this.user = this.createBelongsToAccessorFor('user', usersRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }

  public async findOverrided(data: Find): Promise<Array<Reminders>> {
    const cmd = `
      SELECT
        CASE
          WHEN period_unit = 'day'
          AND TIMESTAMPDIFF(DAY, previous_notify_date, next_notify_date) = period_amount THEN id
          WHEN period_unit = 'week'
          AND TIMESTAMPDIFF(DAY, previous_notify_date, next_notify_date) / 7 = period_amount THEN id
          WHEN period_unit = 'month'
          AND TIMESTAMPDIFF(MONTH, previous_notify_date, next_notify_date) = period_amount THEN id
          WHEN period_unit = 'year'
          AND TIMESTAMPDIFF(YEAR, previous_notify_date, next_notify_date) = period_amount THEN id
        END AS reminderId,
        title,
        \`desc\`,
        period_amount AS periodAmount,
        period_unit AS periodUnit,
        notify_time AS notifyTime,
        previous_notify_date AS previousNotifyDate ,
        next_notify_date AS nextNotifyDate,
        \`repeat\`,
        enabled,
        price,
        user_id AS userId,
        created_at AS createdAt
      FROM
        reminders
      WHERE
        enabled = ?
        AND notify_time = ?
        AND next_notify_date = ? ;`;

    const foundReminders = await this.execute(cmd, [1, data.notifyTime, data.nextNotifyDate]);

    return foundReminders.map((r: object) => new Reminders(r));
  }

  public async updateOverride(ids: Array<number>): Promise<Count> {
    const cmd = `
      UPDATE
        reminders
      SET
        previous_notify_date = next_notify_date,
        next_notify_date = (
          CASE
            WHEN period_unit = 'day' THEN DATE_ADD(next_notify_date, INTERVAL period_amount DAY)
            WHEN period_unit = 'week' THEN DATE_ADD(next_notify_date, INTERVAL period_amount * 7 DAY)
            WHEN period_unit = 'month' THEN DATE_ADD(next_notify_date, INTERVAL period_amount MONTH)
            WHEN period_unit = 'year' THEN DATE_ADD(next_notify_date, INTERVAL period_amount YEAR)
          END ),
        enabled = (
          CASE
            WHEN \`repeat\` = 1 THEN 1
            ELSE 0
          END )
      WHERE
        id IN ( ${_.join(
          _.map([...Array(ids.length)], () => '?'),
          ',',
        )} ) ;`;

    const result = await this.execute(cmd, [...ids]);

    return { count: +result.changedRows };
  }
}
