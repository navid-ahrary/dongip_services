/* eslint-disable @typescript-eslint/camelcase */
module.exports = {
  apps: [{
    name: 'dongip_services',
    script: 'dongip.js',
    args: 'one two',
    instances: 1,
    autorestart: true,
    watch: true,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy: {
    production: {
      user: 'node',
      host: '5.253.24.205',
      ref: 'origin/master',
      repo: 'git+https://gitlab.com/navid_ahrary/dongip_services.git',
      path: '/var/www/production',
      'post-deploy': 'yarn && pm2 reload ecosystem.config.js --env production'
    }
  }
};
