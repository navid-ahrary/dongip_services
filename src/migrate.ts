import { DongipApplication } from './application';

export async function migrate(args: string[]) {
  const existingSchema = args.includes('--rebuild') ? 'drop' : 'alter';
  console.log('Migrating schemas (%s existing schema)', existingSchema);

  const app = new DongipApplication();
  await app.boot();
  await app.migrateSchema({
    existingSchema,
    models: [
      'black_list',
      'verify',
      'users',
      'settings',
      'reminders',
      'messages',
      'categories',
      'users_rels',
      'virtual_users',
      'joint_accounts',
      'joint_account_subscribes',
      'wallets',
      'dongs',
      'receipts',
      'payer_list',
      'bill_list',
      'scores',
      'budgets',
      'purchases',
      'subscriptions',
      'notifications',
      'refresh_tokens',
    ],
  });

  // Connectors usually keep a pool of opened connections,
  // this keeps the process running even after all work is done.
  // We need to exit explicitly.
  process.exit(0);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
migrate(process.argv).catch(err => {
  console.error('Cannot migrate database schema', err);
  process.exit(1);
});
