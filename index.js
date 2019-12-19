const application = require('./dist');
const dotenv = require('dotenv');
dotenv.config();

if (require.main === module) {
  const config = {
    rest: {
      port: +process.env.PORT,
      host: process.env.HOST,
      openApiSpec: {
        setServersFromRequest: true,
      },
      apiExplorer: {
        disable: true,
      },
    },
  };

  await application.main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });

  module.exports = application;
}
