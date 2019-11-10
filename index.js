const application = require('./dist');

if (require.main === module) {
  const config = {
    rest: {
      port: +process.env.PORT || 3000,
      host: process.env.HOST || 'localhost',
      openApiSpec: {
        setServersFromRequest: true,
      },
      apiExplorer: {
        disable: true,
      },
    },
  };

  application.main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });

  module.exports = application;
}
