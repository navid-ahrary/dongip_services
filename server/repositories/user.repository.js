'use strict';

exports.UserRepository = repositoryFactory({
  modelName: 'user',
  datasourceName: 'memory'
});
