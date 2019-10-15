'use strict';

const {
  decorate,
  metadata,
  param
} = require('./helpers.js');
const repository = require('@loopback/repository');
const rest = require('@loopback/rest');
const models = require('../server/models');
const repositories = require('../server/repositories');

module.exports = function (controllerName) {

  controllerName = controllerName.toLowerCase();
  const controllerClassName = controllerName.charAt(0).toUpperCase() + controllerName.slice(1);
  const modelName = controllerClassName;

  // eslint-disable-next-line prefer-const
  let classes = {};

  classes[controllerName] = class {
    constructor(controllerRepository) {
      this.controllerRepository = controllerRepository;
    }
    async create(entity) {
      const create = await this.controllerRepository.create(entity);
      return create;
    }
    async count(where) {
      const where = await this.controllerRepository.count(where);
      return whrere;
    }
    async find(filter) {
      const filter = await this.controllerRepository.find(filter);
      return filter;
    }
    async updateAll(entity, where) {
      const updateAll = await this.controllerRepository.updateAll(entity, where);
      return updateAll;
    }
    async findById(id) {
      const findById = await this.controllerRepository.findById(id);
      return findById;
    }
    async updateById(id, entity) {
      await this.controllerRepository.updateById(id, entity);
    }
    async replaceById(id, entity) {
      await this.controllerRepository.replaceById(id, entity);
    }
    async deleteById(id) {
      await this.controllerRepository.deleteById(id);
    }
  };

  let ControllerClass = classes[controllerName];
  Object.defineProperty(ControllerClass, 'name', {
    writable: true
  });
  ControllerClass.name = controllerClassName + 'Controller';
  Object.defineProperty(ControllerClass, 'name', {
    writable: false
  });

  decorate([
    rest.post(`/${controllerName}`, {
      responses: {
        '200': {
          description: `${modelName} model instance`,
          content: {
            'application/json': {
              schema: {
                'x-ts-type': models[modelName]
              }
            }
          },
        },
      },
    }),
    param(0, rest.requestBody()),
    metadata('design:type', Function),
    metadata('design:paramtypes', [models[modelName]]),
    metadata('design:returntype', Promise)
  ], ControllerClass.prototype, 'create', null);

  decorate([
    rest.get(`/${controllerName}/count`, {
      responses: {
        '200': {
          description: `${modelName} model count`,
          content: {
            'application/json': {
              schema: repository.CountSchema
            }
          },
        },
      },
    }),
    param(0, rest.param.query.object('where', rest.getWhereSchemaFor(models[modelName]))),
    metadata('design:type', Function),
    metadata('design:paramtypes', [Object]),
    metadata('design:returntype', Promise)
  ], ControllerClass.prototype, 'count', null);

  decorate([
    rest.get(`/${controllerName}`, {
      responses: {
        '200': {
          description: 'Array of ${modelName} model instances',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  'x-ts-type': models[modelName]
                }
              },
            },
          },
        },
      },
    }),
    param(0, rest.param.query.object('filter', rest.getFilterSchemaFor(models[modelName]))),
    metadata('design:type', Function),
    metadata('design:paramtypes', [Object]),
    metadata('design:returntype', Promise)
  ], ControllerClass.prototype, 'find', null);

  decorate([
    rest.patch(`/${controllerName}`, {
      responses: {
        '200': {
          description: `${modelName} PATCH success count`,
          content: {
            'application/json': {
              schema: repository.CountSchema
            }
          },
        },
      },
    }),
    param(0, rest.requestBody()),
    param(1, rest.param.query.object('where', rest.getWhereSchemaFor(models[modelName]))),
    metadata('design:type', Function),
    metadata('design:paramtypes', [models[modelName], Object]),
    metadata('design:returntype', Promise)
  ], ControllerClass.prototype, 'updateAll', null);

  decorate([
    rest.get(`/${controllerName}/{id}`, {
      responses: {
        '200': {
          description: `${modelName} model instance`,
          content: {
            'application/json': {
              schema: {
                'x-ts-type': models[modelName]
              }
            }
          },
        },
      },
    }),
    param(0, rest.param.path.number('id')),
    metadata('design:type', Function),
    metadata('design:paramtypes', [Number]),
    metadata('design:returntype', Promise)
  ], ControllerClass.prototype, 'findById', null);

  decorate([
    rest.patch(`/${controllerName}/{id}`, {
      responses: {
        '204': {
          description: `${modelName} PATCH success`,
        },
      },
    }),
    param(0, rest.param.path.number('id')),
    param(1, rest.requestBody()),
    metadata('design:type', Function),
    metadata('design:paramtypes', [Number, models[modelName]]),
    metadata('design:returntype', Promise)
  ], ControllerClass.prototype, 'updateById', null);

  decorate([
    rest.put(`/${controllerName}/{id}`, {
      responses: {
        '204': {
          description: `${modelName} PUT success`,
        },
      },
    }),
    param(0, rest.param.path.number('id')),
    param(1, rest.requestBody()),
    metadata('design:type', Function),
    metadata('design:paramtypes', [Number, models[modelName]]),
    metadata('design:returntype', Promise)
  ], ControllerClass.prototype, 'replaceById', null);

  decorate([
    rest.del(`/${controllerName}/{id}`, {
      responses: {
        '204': {
          description: `${modelName} DELETE success`,
        },
      },
    }),
    param(0, rest.param.path.number('id')),
    metadata('design:type', Function),
    metadata('design:paramtypes', [Number]),
    metadata('design:returntype', Promise)
  ], ControllerClass.prototype, 'deleteById', null);

  const repositoryKey = modelName + 'Repository';
  const modelRepository = repositories[repositoryKey];

  ControllerClass = decorate([
    param(0, repository.repository(modelRepository)),
    metadata('design:paramtypes', [modelRepository])
  ], ControllerClass);

  return ControllerClass;
}
