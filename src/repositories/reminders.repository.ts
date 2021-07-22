import { Getter, inject } from '@loopback/core';
import { BelongsToAccessor, Count, DefaultCrudRepository, repository } from '@loopback/repository';
import { UsersRepository } from '.';
import { MariadbDataSource } from '../datasources';
import { Reminders, RemindersRelations, Users } from '../models';

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

  public async updateOverride(idsList: Array<number>): Promise<Count> {
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
        id IN ( ${[...Array(idsList.length)].map(() => '?').join(',')} ) ;`;

    const result = await this.execute(cmd, idsList);

    return { count: +result.changedRows };
  }
}
