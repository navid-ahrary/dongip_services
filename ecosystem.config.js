/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/camelcase */
module.exports = {
  apps: [{
    name: "dongip",
    script: ".",
    instances: "max",
    exec_mode: "cluster",
    watch: false,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    env: {
      NODE_ENV: "development"
    },
    env_test: {
      NODE_ENV: "test",
    },
    env_staging: {
      NODE_ENV: "staging",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
}
