/* eslint-disable no-var */
'use strict';

/*!
 * Module dependencies
 */
const neo4jdb = require('neo4j-driver').v1;
const util = require('util');
const async = require('async');
const Neo4jConnector = require('loopback-connector').Neo4jConnector;
const debug = require('debug')('loopback:connector:neo4jdb');

exports.ObjectID = ObjectID;
/*!
 * Convert the id to be a BSON ObjectID if it is compatible
 * @param {*} id The id value
 * @returns {ObjectID}
 */
function ObjectID(id: any) {
  if (id instanceof neo4jdb.ObjectID) {
    return id;
  }
  if (typeof id !== 'string') {
    return id;
  }
}

exports.generateNeo4jDBURL = generateNeo4jDBURL;
/*!
 * Generate the mongodb URL from the options
 */
function generateNeo4jDBURL(options) {
  options.protocol = options.protocol || 'bolt';
  options.hostname = options.hostname || options.host || '0.0.0.0';
  options.port = options.port || 7687;
  options.database = options.database || options.db || 'test';

  return options.protocol + '://' + options.hostname + ':' + options.port;
}

/**
 * Initialize the Neo4jDB connector for the given data source
 * @param {DataSource} dataSource The data source instance
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  if (!neo4jdb) {
    return;
  }

  var s = dataSource.settings;

  s.safe = s.safe !== false;
  s.w = s.w || 1;
  s.url = s.url || generateNeo4jDBURL(s);
  dataSource.connector = new Neo4jDB(s, dataSource);

  if (callback) {
    dataSource.connector.connect(callback);
  }
};

/**
 * Helper function to be used in {@ fieldsArrayToObj} in order for V8 to avoid re-creating a new
 * function every time {@ fieldsArrayToObj} is called
 *
 * @see fieldsArrayToObj
 * @param {object} result
 * @param {string} field
 * @returns {object}
 */
function arrayToObjectReducer(result, field) {
  result[field] = 1;
  return result;
}

exports.fieldsArrayToObj = fieldsArrayToObj;

/**
 * Helper function to accept an array representation of fields projection and return the mongo
 * required object notation
 *
 * @param {string[]} fieldsArray
 * @returns {Object}
 */
function fieldsArrayToObj(fieldsArray) {
  if (!Array.isArray(fieldsArray)) return fieldsArray; // fail safe check in case non array object created
  return fieldsArray.length ?
    fieldsArray.reduce(arrayToObjectReducer, {}) : {
      _id: 1,
    };
}

exports.Neo4jDB = Neo4jDB;

/**
 * The constructor for MongoDB connector
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
function Neo4jDB(settings, dataSource) {
  Neo4jConnector.call(this, 'neo4j', settings);

  this.debug = settings.debug || debug.enabled;

  if (this.debug) {
    debug('Settings: %j', settings);
  }

  this.dataSource = dataSource;

}

util.inherits(Neo4jDB, Neo4jConnector);

/**
 * Connect to MongoDB
 * @param {Function} [callback] The callback function
 *
 * @callback callback
 * @param {Error} err The error object
 * @param {Db} db The mongo DB object
 */
Neo4jDB.prototype.connect = function (callback) {
  var self = this;
  if (self.db) {
    process.nextTick(function () {
      if (callback) callback(null, self.db);
    });
  } else if (self.dataSource.connecting) {
    self.dataSource.once('connected', function () {
      process.nextTick(function () {
        if (callback) callback(null, self.db);
      });
    });
  } else {
    // See https://github.com/mongodb/node-mongodb-native/blob/3.0.0/lib/mongo_client.js#L37
    const validOptionNames = [
      'poolSize',
      'ssl',
      'sslValidate',
      'sslCA',
      'sslCert',
      'sslKey',
      'sslPass',
      'sslCRL',
      'autoReconnect',
      'noDelay',
      'keepAlive',
      'keepAliveInitialDelay',
      'connectTimeoutMS',
      'family',
      'socketTimeoutMS',
      'reconnectTries',
      'reconnectInterval',
      'ha',
      'haInterval',
      'replicaSet',
      'secondaryAcceptableLatencyMS',
      'acceptableLatencyMS',
      'connectWithNoPrimary',
      'authSource',
      'w',
      'wtimeout',
      'j',
      'forceServerObjectId',
      'serializeFunctions',
      'ignoreUndefined',
      'raw',
      'bufferMaxEntries',
      'readPreference',
      'pkFactory',
      'promiseLibrary',
      'readConcern',
      'maxStalenessSeconds',
      'loggerLevel',
      'logger',
      'promoteValues',
      'promoteBuffers',
      'promoteLongs',
      'domainsEnabled',
      'checkServerIdentity',
      'validateOptions',
      'appname',
      'auth',
      'user',
      'password',
      'authMechanism',
      'compression',
      'fsync',
      'readPreferenceTags',
      'numberOfRetries',
      'auto_reconnect',
      'minSize',
      'server',
      'replset',
      'replSet',
      'db',
    ];

    let lbOptions = Object.keys(self.settings);
    let validOptions = {};
    lbOptions.forEach(function (option) {
      if (validOptionNames.indexOf(option) > -1) {
        validOptions[option] = self.settings[option];
      }
    });
    debug('Valid options: %j', validOptions);
    new mongodb.MongoClient(self.settings.url, validOptions).connect(function (err, client) {
      if (!err) {
        if (self.debug) {
          debug('MongoDB connection is established: ' + self.settings.url);
        }
        self.client = client;
        // The database name might be in the url
        return urlParser(self.settings.url, self.settings, function (
          err: any,
          url: {
            dbName: any;db_options: any
          },
        ) {
          self.db = client.db(
            url.dbName || self.settings.database,
            url.db_options || self.settings,
          );
          if (callback) callback(err, self.db);
        });
      } else {
        if (self.debug || !callback) {
          g.error(
            '{{MongoDB}} connection is failed: %s %s',
            self.settings.url,
            err,
          );
        }
        if (callback) callback(err, self.db);
      }
    });
  }
};

MongoDB.prototype.getTypes = function () {
  return ['db', 'nosql', 'mongodb'];
};

MongoDB.prototype.getDefaultIdType = function () {
  return ObjectID;
};

/**
 * Get collection name for a given model
 * @param {String} model Model name
 * @returns {String} collection name
 */
MongoDB.prototype.collectionName = function (model: string | number) {
  let modelClass = this._models[model];
  if (modelClass.settings.mongodb) {
    model = modelClass.settings.mongodb.collection || model;
  }
  return model;
};

/**
 * Access a MongoDB collection by model name
 * @param {String} model The model name
 * @returns {*}
 */
MongoDB.prototype.collection = function (model: any) {
  if (!this.db) {
    throw new Error(g.f('{{MongoDB}} connection is not established'));
  }
  let collectionName = this.collectionName(model);
  return this.db.collection(collectionName);
};

/*!
 * Convert the data from database to JSON
 *
 * @param {String} model The model name
 * @param {Object} data The data from DB
 */
MongoDB.prototype.fromDatabase = function (
  model: string | number,
  data: {
    [x: string]: any
  },
) {
  if (!data) {
    return null;
  }
  let modelInfo =
    this._models[model] || this.dataSource.modelBuilder.definitions[model];
  let props = modelInfo.properties;
  for (let p in props) {
    let prop = props[p];
    if (prop && prop.type === Buffer) {
      if (data[p] instanceof mongodb.Binary) {
        // Convert the Binary into Buffer
        data[p] = data[p].read(0, data[p].length());
      }
    } else if (prop && prop.type === String) {
      if (data[p] instanceof mongodb.Binary) {
        // Convert the Binary into String
        data[p] = data[p].toString();
      }
    } else if (
      data[p] &&
      prop &&
      prop.type &&
      prop.type.name === 'GeoPoint' &&
      this.settings.enableGeoIndexing === true
    ) {
      data[p] = {
        lat: data[p].coordinates[1],
        lng: data[p].coordinates[0],
      };
    } else if (data[p] && prop && prop.type.definition) {
      data[p] = this.fromDatabase(prop.type.definition.name, data[p]);
    }
  }

  data = this.fromDatabaseToPropertyNames(model, data);

  return data;
};

/*!
 * Convert JSON to database-appropriate format
 *
 * @param {String} model The model name
 * @param {Object} data The JSON data to convert
 */
MongoDB.prototype.toDatabase = function (
  model: string | number,
  data: {
    [x: string]: {
      lat: any
    }
  },
) {
  const modelInstance = this._models[model].model;
  let props = this._models[model].properties;

  if (this.settings.enableGeoIndexing !== true) {
    visitAllProperties(data, modelInstance, coerceDecimalProperty);
    // Override custom column names
    data = this.fromPropertyToDatabaseNames(model, data);
    return data;
  }

  for (let p in props) {
    let prop = props[p];
    const isGeoPoint =
      data[p] && prop && prop.type && prop.type.name === 'GeoPoint';
    if (isGeoPoint) {
      data[p] = {
        coordinates: [data[p].lng, data[p].lat],
        type: 'Point',
      };
    }
  }

  visitAllProperties(data, modelInstance, coerceDecimalProperty);
  // Override custom column names
  data = this.fromPropertyToDatabaseNames(model, data);
  if (debug.enabled) debug('toDatabase data: ', util.inspect(data));
  return data;
};

/**
 * Execute a mongodb command
 * @param {String} model The model name
 * @param {String} command The command name
 * @param [...] params Parameters for the given command
 */
MongoDB.prototype.execute = function (model: any, command: string) {
  let self = this;
  // Get the parameters for the given command
  let args = [].slice.call(arguments, 2);
  // The last argument must be a callback function
  let callback = args[args.length - 1];

  // Topology is destroyed when the server is disconnected
  // Execute if DB is connected and functional otherwise connect/reconnect first
  if (self.db && self.db.topology && !self.db.topology.isDestroyed()) {
    doExecute();
  } else {
    if (self.db) {
      self.disconnect();
      self.db = null;
    }
    self.connect(function (err: any, db: any) {
      if (err) {
        debug(
          'Connection not established - MongoDB: model=%s command=%s -- error=%s',
          model,
          command,
          err,
        );
      }
      doExecute();
    });
  }

  function doExecute() {
    let collection: {
      [x: string]: {
        apply: (arg0: any, arg1: never[]) => void
      }
    };
    let context = Object.assign({}, {
      model: model,
      collection: collection,
      req: {
        command: command,
        params: args,
      },
    }, );

    try {
      collection = self.collection(model);
    } catch (err) {
      debug('Error: ', err);
      callback(err);
      return;
    }

    if (command in COMMAND_MAPPINGS) {
      context.req.command = COMMAND_MAPPINGS[command];
    }

    self.notifyObserversAround(
      'execute',
      context,
      function (context: {
        res: any
      }, done: (arg0: any, arg1: any) => void) {
        args[args.length - 1] = function (err: any, result: any) {
          if (err) {
            debug('Error: ', err);
          } else {
            context.res = result;
            debug('Result: ', result);
          }
          done(err, result);
        };
        debug('MongoDB: model=%s command=%s', model, command, args);
        return collection[command].apply(collection, args);
      },
      callback,
    );
  }
};

MongoDB.prototype.coerceId = function (
  model: any,
  id: number | null,
  options: any,
) {
  // See https://github.com/strongloop/loopback-connector-mongodb/issues/206
  if (id == null) return id;
  let self = this;
  let idValue = id;
  let idName = self.idName(model);

  // Type conversion for id
  let idProp = self.getPropertyDefinition(model, idName);
  if (idProp && typeof idProp.type === 'function') {
    if (!(idValue instanceof idProp.type)) {
      idValue = idProp.type(id);
      if (idProp.type === Number && isNaN(id)) {
        // Reset to id
        idValue = id;
      }
    }

    if (self.isObjectIDProperty(model, idProp, idValue, options)) {
      idValue = ObjectID(idValue);
    }
  }
  return idValue;
};

/**
 * Create a new model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.create = function (
  model: any,
  data: {
    [x: string]: any;_id: any
  },
  options: any,
  callback: {
    (arg0: any): void;
    (arg0: any, arg1: any): void
  },
) {
  let self = this;
  if (self.debug) {
    debug('create', model, data);
  }
  let idValue = self.getIdValue(model, data);
  let idName = self.idName(model);

  if (idValue === null) {
    delete data[idName]; // Allow MongoDB to generate the id
  } else {
    let oid = self.coerceId(model, idValue, options); // Is it an Object ID?c
    data._id = oid; // Set it to _id
    if (idName !== '_id') {
      delete data[idName];
    }
  }

  data = self.toDatabase(model, data);

  this.execute(
    model,
    'insertOne',
    data, {
      safe: true,
    },
    function (err: any, result: {
      ops: {
        _id: any
      } []
    }) {
      if (self.debug) {
        debug('create.callback', model, err, result);
      }
      if (err) {
        return callback(err);
      }
      idValue = result.ops[0]._id;
      idValue = self.coerceId(model, idValue, options);
      // Wrap it to process.nextTick as delete data._id seems to be interferring
      // with mongo insert
      process.nextTick(function () {
        // Restore the data object
        delete data._id;
        data[idName] = idValue;
        callback(err, err ? null : idValue);
      });
    },
  );
};

/**
 * Save the model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.save = function (
  model: any,
  data: {
    [x: string]: any;_id: any
  },
  options: any,
  callback: (arg0: any, arg1: any, arg2: {}) => void,
) {
  let self = this;
  if (self.debug) {
    debug('save', model, data);
  }
  let idValue = self.getIdValue(model, data);
  let idName = self.idName(model);

  let oid = self.coerceId(model, idValue, options);
  data._id = oid;
  if (idName !== '_id') {
    delete data[idName];
  }

  data = self.toDatabase(model, data);

  this.execute(
    model,
    'updateOne', {
      _id: oid,
    }, {
      $set: data,
    }, {
      upsert: true,
    },
    function (
      err: any,
      result: {
        result: {
          ok: number;n: number;upserted: any
        };ops: any
      },
    ) {
      if (!err) {
        self.setIdValue(model, data, idValue);
        if (idName !== '_id') {
          delete data._id;
        }
      }
      if (self.debug) {
        debug('save.callback', model, err, result);
      }

      let info = {};
      if (result && result.result) {
        // create result formats:
        //   { ok: 1, n: 1, upserted: [ [Object] ] }
        //   { ok: 1, nModified: 0, n: 1, upserted: [ [Object] ] }
        //
        // update result formats:
        //   { ok: 1, n: 1 }
        //   { ok: 1, nModified: 1, n: 1 }
        if (result.result.ok === 1 && result.result.n === 1) {
          info.isNewInstance = !!result.result.upserted;
        } else {
          debug('save result format not recognized: %j', result.result);
        }
      }

      if (callback) {
        callback(err, result && result.ops, info);
      }
    },
  );
};

/**
 * Check if a model instance exists by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 *
 */
MongoDB.prototype.exists = function (
  model: any,
  id: any,
  options: any,
  callback: (arg0: any, arg1: boolean) => void,
) {
  let self = this;
  if (self.debug) {
    debug('exists', model, id);
  }
  id = self.coerceId(model, id, options);
  this.execute(
    model,
    'findOne', {
      _id: id,
    },
    function (err: any, data: any) {
      if (self.debug) {
        debug('exists.callback', model, id, err, data);
      }
      callback(err, !!(!err && data));
    },
  );
};

/**
 * Find a model instance by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.find = function find(
  model: any,
  id: any,
  options: any,
  callback: (arg0: any, arg1: any) => void,
) {
  let self = this;
  if (self.debug) {
    debug('find', model, id);
  }
  let idName = self.idName(model);
  let oid = self.coerceId(model, id, options);
  this.execute(
    model,
    'findOne', {
      _id: oid,
    },
    function (err: any, data: {
      _id: any
    }) {
      if (self.debug) {
        debug('find.callback', model, id, err, data);
      }

      data = self.fromDatabase(model, data);
      if (data && idName !== '_id') {
        delete data._id;
      }
      if (callback) {
        callback(err, data);
      }
    },
  );
};

Connector.defineAliases(MongoDB.prototype, 'find', 'findById');

/**
 * Parses the data input for update operations and returns the
 * sanitised version of the object.
 *
 * @param data
 * @returns {*}
 */
MongoDB.prototype.parseUpdateData = function (
  model: string | number,
  data: {
    [x: string]: any
  },
  options: {
    hasOwnProperty ? : any;allowExtendedOperators ? : any
  },
) {
  options = options || {};
  let parsedData = {};

  let modelClass = this._models[model];

  let allowExtendedOperators = this.settings.allowExtendedOperators;
  if (options.hasOwnProperty('allowExtendedOperators')) {
    allowExtendedOperators = options.allowExtendedOperators === true;
  } else if (
    allowExtendedOperators !== false &&
    modelClass.settings.mongodb &&
    modelClass.settings.mongodb.hasOwnProperty('allowExtendedOperators')
  ) {
    allowExtendedOperators =
      modelClass.settings.mongodb.allowExtendedOperators === true;
  } else if (allowExtendedOperators === true) {
    allowExtendedOperators = true;
  }

  if (allowExtendedOperators) {
    // Check for other operators and sanitize the data obj
    let acceptedOperators = [
      // Field operators
      '$currentDate',
      '$inc',
      '$max',
      '$min',
      '$mul',
      '$rename',
      '$setOnInsert',
      '$set',
      '$unset',
      // Array operators
      '$addToSet',
      '$pop',
      '$pullAll',
      '$pull',
      '$pushAll',
      '$push',
      // Bitwise operator
      '$bit',
    ];

    let usedOperators = 0;

    // each accepted operator will take its place on parsedData if defined
    for (let i = 0; i < acceptedOperators.length; i++) {
      if (data[acceptedOperators[i]]) {
        parsedData[acceptedOperators[i]] = data[acceptedOperators[i]];
        usedOperators++;
      }
    }

    // if parsedData is still empty, then we fallback to $set operator
    if (usedOperators === 0 && Object.keys(data).length > 0) {
      parsedData.$set = data;
    }
  } else if (Object.keys(data).length > 0) {
    parsedData.$set = data;
  }

  return parsedData;
};

/**
 * Update if the model instance exists with the same id or create a new instance
 *
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.updateOrCreate = function updateOrCreate(
  model: string,
  data: {
    [x: string]: any
  },
  options: any,
  callback: (
    arg0: any,
    arg1: any,
    arg2: {
      isNewInstance: boolean
    } | undefined,
  ) => void,
) {
  let self = this;
  if (self.debug) {
    debug('updateOrCreate', model, data);
  }

  let id = self.getIdValue(model, data);
  let idName = self.idName(model);
  let oid = self.coerceId(model, id, options);
  delete data[idName];

  data = self.toDatabase(model, data);

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(model, data, options);

  this.execute(
    model,
    'findOneAndUpdate', {
      _id: oid,
    },
    data, {
      upsert: true,
      returnOriginal: false,
      sort: [
        ['_id', 'asc']
      ],
    },
    function (
      err: string,
      result: {
        value: any;lastErrorObject: {
          updatedExisting: any
        }
      },
    ) {
      if (self.debug) {
        debug('updateOrCreate.callback', model, id, err, result);
      }
      let object = result && result.value;
      if (!err && !object) {
        // No result
        err = 'No ' + model + ' found for id ' + id;
      }
      if (!err) {
        self.setIdValue(model, object, oid);
        if (object && idName !== '_id') {
          delete object._id;
        }
      }

      let info;
      if (result && result.lastErrorObject) {
        info = {
          isNewInstance: !result.lastErrorObject.updatedExisting,
        };
      } else {
        debug('updateOrCreate result format not recognized: %j', result);
      }

      if (callback) {
        callback(err, object, info);
      }
    },
  );
};

/**
 * Replace model instance if it exists or create a new one if it doesn't
 *
 * @param {String} model The name of the model
 * @param {Object} data The model instance data
 * @param {Object} options The options object
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.replaceOrCreate = function (
  model: any,
  data: {
    [x: string]: any;_id: any
  },
  options: any,
  cb: any,
) {
  if (this.debug) debug('replaceOrCreate', model, data);

  let id = this.getIdValue(model, data);
  let oid = this.coerceId(model, id, options);
  let idName = this.idName(model);
  data._id = data[idName];
  delete data[idName];
  this.replaceWithOptions(
    model,
    oid,
    data, {
      upsert: true,
    },
    cb,
  );
};

/**
 * Delete a model instance by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param [callback] The callback function
 */
MongoDB.prototype.destroy = function destroy(
  model: any,
  id: any,
  options: any,
  callback: (arg0: any, arg1: any) => void,
) {
  let self = this;
  if (self.debug) {
    debug('delete', model, id);
  }
  id = self.coerceId(model, id, options);
  this.execute(
    model,
    'deleteOne', {
      _id: id,
    },
    function (err: any, result: {
      result: any
    }) {
      if (self.debug) {
        debug('delete.callback', model, id, err, result);
      }
      let res = result && result.result;
      if (res) {
        res = {
          count: res.n,
        };
      }
      if (callback) {
        callback(err, res);
      }
    },
  );
};

/*!
 * Decide if id should be included
 * @param {Object} fields
 * @returns {Boolean}
 * @private
 */
function idIncluded(
  fields: {
    [x: string]: any;indexOf: (arg0: any) => number
  },
  idName: string,
) {
  if (!fields) {
    return true;
  }
  if (Array.isArray(fields)) {
    return fields.indexOf(idName) >= 0;
  }
  if (fields[idName]) {
    // Included
    return true;
  }
  if (idName in fields && !fields[idName]) {
    // Excluded
    return false;
  }
  for (let f in fields) {
    return !fields[f]; // If the fields has exclusion
  }
  return true;
}

MongoDB.prototype.buildWhere = function (
  model: any,
  where: {
    [x: string]: any
  } | null,
  options: any,
) {
  let self = this;
  let query = {};
  if (where === null || typeof where !== 'object') {
    return query;
  }

  where = sanitizeFilter(where, options);

  let idName = self.idName(model);
  Object.keys(where).forEach(function (k) {
    let cond = where[k];
    if (k === 'and' || k === 'or' || k === 'nor') {
      if (Array.isArray(cond)) {
        cond = cond.map(function (c) {
          return self.buildWhere(model, c, options);
        });
      }
      query['$' + k] = cond;
      delete query[k];
      return;
    }
    if (k === idName) {
      k = '_id';
    }
    let propName = k;
    if (k === '_id') {
      propName = idName;
    }

    let prop = self.getPropertyDefinition(model, propName);

    const isDecimal =
      prop &&
      prop.mongodb &&
      prop.mongodb.dataType &&
      prop.mongodb.dataType.toLowerCase() === 'decimal128';
    if (isDecimal) {
      cond = Decimal128.fromString(cond);
      debug(
        'buildWhere decimal value: %s, constructor name: %s',
        cond,
        cond.constructor.name,
      );
    }

    // Convert property to database column name
    k = self.getDatabaseColumnName(model, k);

    let spec = false;
    let regexOptions = null;
    if (cond && cond.constructor.name === 'Object') {
      regexOptions = cond.options;
      spec = Object.keys(cond)[0];
      cond = cond[spec];
    }
    if (spec) {
      if (spec === 'between') {
        query[k] = {
          $gte: cond[0],
          $lte: cond[1],
        };
      } else if (spec === 'inq') {
        cond = [].concat(cond || []);
        query[k] = {
          $in: cond.map(function (x: any) {
            if (self.isObjectIDProperty(model, prop, x, options))
              return ObjectID(x);
            return x;
          }),
        };
      } else if (spec === 'nin') {
        cond = [].concat(cond || []);
        query[k] = {
          $nin: cond.map(function (x: any) {
            if (self.isObjectIDProperty(model, prop, x, options))
              return ObjectID(x);
            return x;
          }),
        };
      } else if (spec === 'like') {
        if (cond instanceof RegExp) {
          query[k] = {
            $regex: cond,
          };
        } else {
          query[k] = {
            $regex: new RegExp(cond, regexOptions),
          };
        }
      } else if (spec === 'nlike') {
        if (cond instanceof RegExp) {
          query[k] = {
            $not: cond,
          };
        } else {
          query[k] = {
            $not: new RegExp(cond, regexOptions),
          };
        }
      } else if (spec === 'neq') {
        query[k] = {
          $ne: cond,
        };
      } else if (spec === 'regexp') {
        if (cond.global)
          g.warn('{{MongoDB}} regex syntax does not respect the {{`g`}} flag');

        query[k] = {
          $regex: cond,
        };
      } else {
        query[k] = {};
        query[k]['$' + spec] = cond;
      }
    } else {
      if (cond === null) {
        // http://docs.mongodb.org/manual/reference/operator/query/type/
        // Null: 10
        query[k] = {
          $type: 10,
        };
      } else {
        if (self.isObjectIDProperty(model, prop, cond, options)) {
          cond = ObjectID(cond);
        }
        query[k] = cond;
      }
    }
  });
  return query;
};

MongoDB.prototype.buildSort = function (
  model: string | number,
  order: any,
  options: {
    hasOwnProperty: (arg0: string) => void;
    disableDefaultSort: boolean;
  },
) {
  let sort = {};
  let idName = this.idName(model);

  let modelClass = this._models[model];

  let disableDefaultSort = false;
  if (this.settings.hasOwnProperty('disableDefaultSort')) {
    disableDefaultSort = this.settings.disableDefaultSort;
  }
  if (modelClass.settings.hasOwnProperty('disableDefaultSort')) {
    disableDefaultSort = modelClass.settings.disableDefaultSort;
  }
  if (options && options.hasOwnProperty('disableDefaultSort')) {
    disableDefaultSort = options.disableDefaultSort;
  }

  if (!order && !disableDefaultSort) {
    let idNames = this.idNames(model);
    if (idNames && idNames.length) {
      order = idNames;
    }
  }
  if (order) {
    order = sanitizeFilter(order, options);
    let keys = order;
    if (typeof keys === 'string') {
      keys = keys.split(',');
    }
    for (let index = 0, len = keys.length; index < len; index++) {
      let m = keys[index].match(/\s+(A|DE)SC$/);
      let key = keys[index];
      key = key.replace(/\s+(A|DE)SC$/, '').trim();
      if (key === idName) {
        key = '_id';
      } else {
        key = this.getDatabaseColumnName(model, key);
      }

      if (m && m[1] === 'DE') {
        sort[key] = -1;
      } else {
        sort[key] = 1;
      }
    }
  } else if (!disableDefaultSort) {
    // order by _id by default
    sort = {
      _id: 1,
    };
  }
  return sort;
};

function convertToMeters(distance: number, unit: string) {
  switch (unit) {
    case 'meters':
      return distance;
    case 'kilometers':
      return distance * 1000;
    case 'miles':
      return distance * 1600;
    case 'feet':
      return distance * 0.3048;
    default:
      console.warn(
        'unsupported unit ' +
        unit +
        ", fallback to mongodb default unit 'meters'",
      );
      return distance;
  }
}

function buildNearFilter(
  query: {
    where: {
      [x: string]: {
        near: {
          $geometry: {
            coordinates: any[];type: string
          }
        }
      };
    };
  },
  params: any[],
) {
  if (!Array.isArray(params)) {
    params = [params];
  }

  params.forEach(function (near: {
    [x: string]: any;
    near: any[];
    unit: string;
    mongoKey: string | number | (string | number)[];
  }) {
    let coordinates = {};

    if (typeof near.near === 'string') {
      let s = near.near.split(',');
      coordinates.lng = parseFloat(s[0]);
      coordinates.lat = parseFloat(s[1]);
    } else if (Array.isArray(near.near)) {
      coordinates.lng = near.near[0];
      coordinates.lat = near.near[1];
    } else {
      coordinates = near.near;
    }

    let props = ['maxDistance', 'minDistance'];
    // use mongodb default unit 'meters' rather than 'miles'
    let unit = near.unit || 'meters';

    let queryValue = {
      near: {
        $geometry: {
          coordinates: [coordinates.lng, coordinates.lat],
          type: 'Point',
        },
      },
    };

    props.forEach(function (p) {
      if (near[p]) {
        queryValue.near['$' + p] = convertToMeters(near[p], unit);
      }
    });

    let property;

    if (near.mongoKey) {
      // if mongoKey is an Array, set the $near query at the right depth, following the Array
      if (Array.isArray(near.mongoKey)) {
        property = query.where;

        for (var i = 0; i < near.mongoKey.length; i++) {
          let subKey = near.mongoKey[i];

          if (near.mongoKey.hasOwnProperty(i + 1)) {
            if (!property.hasOwnProperty(subKey)) {
              property[subKey] = Number.isInteger(near.mongoKey[i + 1]) ? [] : {};
            }

            property = property[subKey];
          }
        }

        property[near.mongoKey[i - 1]] = queryValue;
      } else {
        // mongoKey is a single string, just set it directly
        property = query.where[near.mongoKey] = queryValue;
      }
    }
  });
}

function hasNearFilter(where: any) {
  if (!where) return false;
  // TODO: Optimize to return once a `near` key is found
  // instead of searching through everything

  let isFound = false;

  searchForNear(where);

  function found(prop: {
    near: any
  }) {
    return prop && prop.near;
  }

  function searchForNear(node: {
    [x: string]: any;forEach ? : any
  }) {
    if (!node) {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(function (prop) {
        isFound = found(prop);

        if (!isFound) {
          searchForNear(prop);
        }
      });
    } else if (typeof node === 'object') {
      Object.keys(node).forEach(function (key) {
        let prop = node[key];

        isFound = found(prop);

        if (!isFound) {
          searchForNear(prop);
        }
      });
    }
  }
  return isFound;
}

MongoDB.prototype.getDatabaseColumnName = function (
  model: string | number,
  propName: string | number,
) {
  if (typeof model === 'string') {
    model = this._models[model];
  }

  if (typeof model !== 'object') {
    return propName; // unknown model type?
  }

  if (typeof model.properties !== 'object') {
    return propName; // missing model properties?
  }

  let prop = model.properties[propName] || {};

  // console.log('getDatabaseColumnName', propName, prop);

  // Try mongo overrides
  if (prop.mongodb) {
    propName =
      prop.mongodb.fieldName ||
      prop.mongodb.field ||
      prop.mongodb.columnName ||
      prop.mongodb.column ||
      prop.columnName ||
      prop.column ||
      propName;
  } else {
    // Try top level overrides
    propName = prop.columnName || prop.column || propName;
  }

  // Done
  // console.log('->', propName);
  return propName;
};

MongoDB.prototype.convertColumnNames = function (
  model: string | number,
  data: {
    [x: string]: any
  },
  direction: string,
) {
  if (typeof data !== 'object') {
    return data; // skip
  }

  if (typeof model === 'string') {
    model = this._models[model];
  }

  if (typeof model !== 'object') {
    return data; // unknown model type?
  }

  if (typeof model.properties !== 'object') {
    return data; // missing model properties?
  }

  for (let propName in model.properties) {
    let columnName = this.getDatabaseColumnName(model, propName);

    // Copy keys/data if needed
    if (propName === columnName) {
      continue;
    }

    if (direction === 'database') {
      data[columnName] = data[propName];
      delete data[propName];
    }

    if (direction === 'property') {
      data[propName] = data[columnName];
      delete data[columnName];
    }
  }

  return data;
};

MongoDB.prototype.fromPropertyToDatabaseNames = function (
  model: any,
  data: any,
) {
  return this.convertColumnNames(model, data, 'database');
};

MongoDB.prototype.fromDatabaseToPropertyNames = function (
  model: any,
  data: any,
) {
  return this.convertColumnNames(model, data, 'property');
};

/**
 * Find matching model instances by the filter
 *
 * @param {String} model The model name
 * @param {Object} filter The filter
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.all = function all(
  model: string | number,
  filter: {
    where ? : any;
    fields ? : any;
    order ? : any;
    limit ? : any;
    skip ? : any;
    offset ? : any;
    include ? : any;
  },
  options: {
    collation: any
  },
  callback: {
    (arg0: any): void;
    (arg0: any): void;
    (arg0: null, arg1: any): void;
  },
) {
  let self = this;
  if (self.debug) {
    debug('all', model, filter);
  }
  filter = filter || {};
  let idName = self.idName(model);
  let query = {};
  if (filter.where) {
    query = self.buildWhere(model, filter.where, options);
  }
  let fields = filter.fields;

  // Convert custom column names
  fields = self.fromPropertyToDatabaseNames(model, fields);

  if (fields) {
    let findOpts = {
      projection: fieldsArrayToObj(fields),
    };
    this.execute(model, 'find', query, findOpts, processResponse);
  } else {
    this.execute(model, 'find', query, processResponse);
  }

  function processResponse(
    err: any,
    cursor: {
      collation: (arg0: any) => void;
      sort: (arg0: any) => void;
      limit: (arg0: any) => void;
      skip: {
        (arg0: any): void;
        (arg0: any): void
      };
      toArray: (arg0: (err: any, data: any) => any) => void;
    },
  ) {
    if (err) {
      return callback(err);
    }

    let collation = options && options.collation;
    if (collation) {
      cursor.collation(collation);
    }

    // don't apply sorting if dealing with a geo query
    if (!hasNearFilter(filter.where)) {
      let order = self.buildSort(model, filter.order, options);
      cursor.sort(order);
    }

    if (filter.limit) {
      cursor.limit(filter.limit);
    }
    if (filter.skip) {
      cursor.skip(filter.skip);
    } else if (filter.offset) {
      cursor.skip(filter.offset);
    }

    let shouldSetIdValue = idIncluded(fields, idName);
    let deleteMongoId = !shouldSetIdValue || idName !== '_id';

    cursor.toArray(function (
      err: any,
      data: {
        map: (arg0: (o: any) => any) => void
      },
    ) {
      if (self.debug) {
        debug('all', model, filter, err, data);
      }
      if (err) {
        return callback(err);
      }
      let objs = data.map(function (o: {
        _id: any
      }) {
        if (shouldSetIdValue) {
          self.setIdValue(model, o, o._id);
        }
        // Don't pass back _id if the fields is set
        if (deleteMongoId) {
          delete o._id;
        }

        o = self.fromDatabase(model, o);
        return o;
      });
      if (filter && filter.include) {
        self._models[model].model.include(
          objs,
          filter.include,
          options,
          callback,
        );
      } else {
        callback(null, objs);
      }
    });
  }
};

/**
 * Delete all instances for the given model
 * @param {String} model The model name
 * @param {Object} [where] The filter for where
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.destroyAll = function destroyAll(
  model: any,
  where: undefined,
  options: any,
  callback: {
    (arg0: any): void;
    (arg0: any, arg1: {
      count: any
    }): void
  },
) {
  let self = this;
  if (self.debug) {
    debug('destroyAll', model, where);
  }
  if (!callback && 'function' === typeof where) {
    callback = where;
    where = undefined;
  }
  where = self.buildWhere(model, where, options);
  if (debug.enabled) debug('destroyAll where %s', util.inspect(where));

  this.execute(model, 'deleteMany', where || {}, function (
    err: any,
    info: {
      result: {
        n: any
      }
    },
  ) {
    if (err) return callback && callback(err);

    if (self.debug) debug('destroyAll.callback', model, where, err, info);

    let affectedCount = info.result ? info.result.n : undefined;

    if (callback) {
      callback(err, {
        count: affectedCount,
      });
    }
  });
};

/**
 * Count the number of instances for the given model
 *
 * @param {String} model The model name
 * @param {Function} [callback] The callback function
 * @param {Object} filter The filter for where
 *
 */
MongoDB.prototype.count = function count(
  model: any,
  where: {},
  options: any,
  callback: (arg0: any, arg1: any) => void,
) {
  let self = this;
  if (self.debug) {
    debug('count', model, where);
  }
  where = self.buildWhere(model, where, options) || {};
  const method =
    Object.keys(where).length === 0 ?
    'estimatedDocumentCount' :
    'countDocuments';
  this.execute(model, method, where, function (err: any, count: any) {
    if (self.debug) {
      debug('count.callback', model, err, count);
    }
    if (callback) {
      callback(err, count);
    }
  });
};

/**
 * Replace properties for the model instance data
 * @param {String} model The name of the model
 * @param {*} id The instance id
 * @param {Object} data The model data
 * @param {Object} options The options object
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.replaceById = function replace(
  model: any,
  id: any,
  data: any,
  options: any,
  cb: (arg0: any, arg1: any) => void,
) {
  if (this.debug) debug('replace', model, id, data);
  let oid = this.coerceId(model, id, options);
  this.replaceWithOptions(
    model,
    oid,
    data, {
      upsert: false,
    },
    function (err: any, data: any) {
      cb(err, data);
    },
  );
};

function errorIdNotFoundForReplace(idValue: string) {
  let msg = 'Could not replace. Object with id ' + idValue + ' does not exist!';
  let error = new Error(msg);
  error.statusCode = error.status = 404;
  return error;
}

/**
 * Update a model instance with id
 * @param {String} model The name of the model
 * @param {Object} id The id of the model instance
 * @param {Object} data The property/value pairs to be updated or inserted if {upsert: true} is passed as options
 * @param {Object} options The options you want to pass for update, e.g, {upsert: true}
 * @callback {Function} [cb] Callback function
 */
MongoDB.prototype.replaceWithOptions = function (
  model: any,
  id: any,
  data: {
    [x: string]: any
  },
  options: any,
  cb: {
    (arg0: any): void;
    (arg0: any, arg1: any, arg2: {}): void
  },
) {
  let self = this;
  let idName = self.idName(model);
  delete data[idName];
  this.execute(
    model,
    'replaceOne', {
      _id: id,
    },
    data,
    options,
    function (
      err: Error,
      info: {
        result: {
          n: number;nModified: number | undefined
        }
      },
    ) {
      debug(
        'updateWithOptions.callback',
        model, {
          _id: id,
        },
        data,
        err,
        info,
      );
      if (err) return cb && cb(err);
      let result;
      let cbInfo = {};
      if (info.result && info.result.n == 1) {
        result = data;
        delete result._id;
        result[idName] = id;
        // create result formats:
        //   2.4.x :{ ok: 1, n: 1, upserted: [ Object ] }
        //   { ok: 1, nModified: 0, n: 1, upserted: [ Object ] }
        //
        // replace result formats:
        //   2.4.x: { ok: 1, n: 1 }
        //   { ok: 1, nModified: 1, n: 1 }
        if (info.result.nModified !== undefined) {
          cbInfo.isNewInstance = info.result.nModified === 0;
        }
      } else {
        result = undefined;
        err = errorIdNotFoundForReplace(id);
      }
      if (cb) {
        cb(err, result, cbInfo);
      }
    },
  );
};

/**
 * Update properties for the model instance data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
MongoDB.prototype.updateAttributes = function updateAttrs(
  model: any,
  id: any,
  data: {},
  options: any,
  cb: {
    (arg0: null, arg1: {}): void;
    (arg0: any, arg1: any): void
  },
) {
  let self = this;

  data = self.toDatabase(model, data || {});

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(model, data, options);

  if (self.debug) {
    debug('updateAttributes', model, id, data);
  }

  if (Object.keys(data).length === 0) {
    if (cb) {
      process.nextTick(function () {
        cb(null, {});
      });
    }
    return;
  }

  let oid = self.coerceId(model, id, options);
  let idName = this.idName(model);

  this.execute(
    model,
    'findOneAndUpdate', {
      _id: oid,
    },
    data, {
      sort: [
        ['_id', 'asc']
      ],
    },
    function (err: Error, result: {
      value: any
    }) {
      if (self.debug) {
        debug('updateAttributes.callback', model, id, err, result);
      }
      let object = result && result.value;
      if (!err && !object) {
        // No result
        err = errorIdNotFoundForUpdate(model, id);
      }
      self.setIdValue(model, object, id);
      if (object && idName !== '_id') {
        delete object._id;
      }
      if (cb) {
        cb(err, object);
      }
    },
  );
};

function errorIdNotFoundForUpdate(modelvalue: string, idValue: string) {
  let msg = 'No ' + modelvalue + ' found for id ' + idValue;
  let error = new Error(msg);
  error.statusCode = error.status = 404;
  return error;
}

/**
 * Update all matching instances
 * @param {String} model The model name
 * @param {Object} where The search criteria
 * @param {Object} data The property/value pairs to be updated
 * @callback {Function} cb Callback function
 */
MongoDB.prototype.update = MongoDB.prototype.updateAll = function updateAll(
  model: any,
  where: any,
  data: {
    [x: string]: any
  },
  options: any,
  cb: {
    (arg0: any): void;
    (arg0: any, arg1: {
      count: any
    }): void
  },
) {
  let self = this;
  if (self.debug) {
    debug('updateAll', model, where, data);
  }
  let idName = this.idName(model);

  where = self.buildWhere(model, where, options);

  delete data[idName];
  data = self.toDatabase(model, data);

  // Check for other operators and sanitize the data obj
  data = self.parseUpdateData(model, data, options);

  this.execute(
    model,
    'updateMany',
    where,
    data, {
      upsert: false,
    },
    function (err: any, info: {
      result: {
        n: any
      }
    }) {
      if (err) return cb && cb(err);

      if (self.debug)
        debug('updateAll.callback', model, where, data, err, info);

      let affectedCount = info.result ? info.result.n : undefined;

      if (cb) {
        cb(err, {
          count: affectedCount,
        });
      }
    },
  );
};

/**
 * Disconnect from MongoDB
 */
MongoDB.prototype.disconnect = function (cb: Function) {
  if (this.debug) {
    debug('disconnect');
  }
  if (this.db) {
    this.db.unref();
  }
  if (this.client) {
    this.client.close();
  }
  if (cb) {
    process.nextTick(cb);
  }
};

/**
 * Perform autoupdate for the given models. It basically calls createIndex
 * @param {String[]} [models] A model name or an array of model names. If not
 * present, apply to all models
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.autoupdate = function (models: string[] | undefined, cb: any) {
  let self = this;
  if (self.db) {
    if (self.debug) {
      debug('autoupdate');
    }
    if (!cb && 'function' === typeof models) {
      cb = models;
      models = undefined;
    }
    // First argument is a model name
    if ('string' === typeof models) {
      models = [models];
    }

    models = models || Object.keys(self._models);

    let enableGeoIndexing = this.settings.enableGeoIndexing === true;

    async.each(
      models,
      function (model: string | number, modelCallback: any) {
        let indexes = self._models[model].settings.indexes || [];
        let indexList: any[] | never[] | {} [] = [];
        let index = {};
        let options = {};

        if (typeof indexes === 'object') {
          for (let indexName in indexes) {
            index = indexes[indexName];
            if (index.keys) {
              // The index object has keys
              options = index.options || {};
              options.name = options.name || indexName;
              index.options = options;
            } else {
              options = {
                name: indexName,
              };
              index = {
                keys: index,
                options: options,
              };
            }
            indexList.push(index);
          }
        } else if (Array.isArray(indexes)) {
          indexList = indexList.concat(indexes);
        }
        let properties = self._models[model].properties;
        /* eslint-disable one-var */
        for (let p in properties) {
          if (properties[p].index) {
            index = {};
            index[p] = 1; // Add the index key
            if (typeof properties[p].index === 'object') {
              // If there is a mongodb key for the index, use it
              if (typeof properties[p].index.mongodb === 'object') {
                options = properties[p].index.mongodb;
                index[p] = options.kind || 1;

                // If 'kind' is set delete it so it isn't accidentally inserted as an index option
                if (options.kind) {
                  delete options.kind;
                }

                // Backwards compatibility for former type of indexes
                if (properties[p].index.unique === true) {
                  options.unique = true;
                }
              } else {
                // If there isn't an  properties[p].index.mongodb object, we read the properties from  properties[p].index
                options = properties[p].index;
              }

              if (options.background === undefined) {
                options.background = true;
              }
            } else if (
              enableGeoIndexing &&
              properties[p].type &&
              properties[p].type.name === 'GeoPoint'
            ) {
              let indexType =
                typeof properties[p].index === 'string' ?
                properties[p].index :
                '2dsphere';

              options = {
                name: 'index' + indexType + p,
              };
              index[p] = indexType;
            } else {
              options = {
                background: true,
              };
              if (properties[p].unique) {
                options.unique = true;
              }
            }
            indexList.push({
              keys: index,
              options: options,
            });
          }
        }
        /* eslint-enable one-var */

        if (self.debug) {
          debug('create indexes: ', indexList);
        }

        async.each(
          indexList,
          function (
            index: {
              fields: any;keys: any;options: any
            },
            indexCallback: any,
          ) {
            if (self.debug) {
              debug('createIndex: ', index);
            }
            self
              .collection(model)
              .createIndex(
                index.fields || index.keys,
                index.options,
                indexCallback,
              );
          },
          modelCallback,
        );
      },
      cb,
    );
  } else {
    self.dataSource.once('connected', function () {
      self.autoupdate(models, cb);
    });
  }
};

/**
 * Perform automigrate for the given models. It drops the corresponding collections
 * and calls createIndex
 * @param {String[]} [models] A model name or an array of model names. If not present, apply to all models
 * @param {Function} [cb] The callback function
 */
MongoDB.prototype.automigrate = function (
  models: string[] | undefined,
  cb: (arg0: any) => void,
) {
  let self = this;
  if (self.db) {
    if (self.debug) {
      debug('automigrate');
    }
    if (!cb && 'function' === typeof models) {
      cb = models;
      models = undefined;
    }
    // First argument is a model name
    if ('string' === typeof models) {
      models = [models];
    }

    models = models || Object.keys(self._models);

    // Make it serial as multiple models might map to the same collection
    async.eachSeries(
      models,
      function (model: any, modelCallback: (arg0: any) => void) {
        let collectionName = self.collectionName(model);
        if (self.debug) {
          debug('drop collection %s for model %s', collectionName, model);
        }

        self.db.dropCollection(collectionName, function (
          err: {
            name: string;ok: number;errmsg: string
          },
          collection: any,
        ) {
          if (err) {
            debug(
              'Error dropping collection %s for model %s: ',
              collectionName,
              model,
              err,
            );
            if (
              !(
                err.name === 'MongoError' &&
                err.ok === 0 &&
                err.errmsg === 'ns not found'
              )
            ) {
              // For errors other than 'ns not found' (collection doesn't exist)
              return modelCallback(err);
            }
          }
          // Recreate the collection
          if (self.debug) {
            debug('create collection %s for model %s', collectionName, model);
          }
          self.db.createCollection(collectionName, modelCallback);
        });
      },
      function (err: any) {
        if (err) {
          return cb && cb(err);
        }
        self.autoupdate(models, cb);
      },
    );
  } else {
    self.dataSource.once('connected', function () {
      self.automigrate(models, cb);
    });
  }
};

MongoDB.prototype.ping = function (cb: (arg0: any) => void) {
  let self = this;
  if (self.db) {
    this.db.collection('dummy').findOne({
        _id: 1,
      },
      cb,
    );
  } else {
    self.dataSource.once('connected', function () {
      self.ping(cb);
    });
    self.dataSource.once('error', function (err: any) {
      cb(err);
    });
    self.connect(function () {});
  }
};

/**
 * Check whether the property is an ObjectID (or Array thereof)
 *
 */
MongoDB.prototype.isObjectIDProperty = function (
  model: string | number,
  prop: {
    type: ((id: any) => any)[]
  },
  value: string,
  options: {
    strictObjectIDCoercion ? : any
  },
) {
  if (
    prop &&
    (prop.type === ObjectID ||
      (Array.isArray(prop.type) && prop.type[0] === ObjectID))
  ) {
    return true;
  } else if ('string' === typeof value) {
    let settings = this._models[model] && this._models[model].settings;
    options = options || {};
    let strict =
      (settings && settings.strictObjectIDCoercion) ||
      this.settings.strictObjectIDCoercion ||
      options.strictObjectIDCoercion;
    if (strict) return false; // unless explicitly typed, don't coerce
    return /^[0-9a-fA-F]{24}$/.test(value);
  } else {
    return false;
  }
};

function sanitizeFilter(
  filter: {
    [x: string]: any
  },
  options: {
    disableSanitization: any
  },
) {
  options = Object.assign({}, options);
  if (options && options.disableSanitization) return filter;
  if (!filter || typeof filter !== 'object') return filter;

  for (const key in filter) {
    if (key === '$where' || key === 'mapReduce') {
      debug(`sanitizeFilter: deleting ${key}`);
      delete filter[key];
    }
  }

  return filter;
}

exports.sanitizeFilter = sanitizeFilter;

/**
 * Find a matching model instances by the filter or create a new instance
 *
 * Only supported on mongodb 2.6+
 *
 * @param {String} model The model name
 * @param {Object} data The model instance data
 * @param {Object} filter The filter
 * @param {Function} [callback] The callback function
 */
function optimizedFindOrCreate(
  this: any,
  model: string | number,
  filter: {
    where ? : any;order ? : any;fields ? : any;include ? : any
  },
  data: {
    [x: string]: any;_id: any
  },
  options: any,
  callback: {
    (arg0: any): void;
    (arg0: any, arg1: any, arg2: boolean): void;
    (arg0: null, arg1: any, arg2: boolean): void;
  },
) {
  let self = this;
  if (self.debug) {
    debug('findOrCreate', model, filter, data);
  }

  if (!callback) callback = options;

  let idValue = self.getIdValue(model, data);
  let idName = self.idName(model);

  if (idValue == null) {
    delete data[idName]; // Allow MongoDB to generate the id
  } else {
    let oid = self.coerceId(model, idValue, options); // Is it an Object ID?
    data._id = oid; // Set it to _id
    if (idName !== '_id') {
      delete data[idName];
    }
  }

  filter = filter || {};
  let query = {};
  if (filter.where) {
    if (filter.where[idName]) {
      let id = filter.where[idName];
      delete filter.where[idName];
      id = self.coerceId(model, id, options);
      filter.where._id = id;
    }
    query = self.buildWhere(model, filter.where, options);
  }

  let sort = self.buildSort(model, filter.order, options);

  let projection = fieldsArrayToObj(filter.fields);

  this.collection(model).findOneAndUpdate(
    query, {
      $setOnInsert: data,
    }, {
      projection: projection,
      sort: sort,
      upsert: true,
    },
    function (err: any, result: {
      value: any;lastErrorObject: {
        upserted: any
      }
    }) {
      if (self.debug) {
        debug('findOrCreate.callback', model, filter, err, result);
      }
      if (err) {
        return callback(err);
      }

      let value = result.value;
      let created = !!result.lastErrorObject.upserted;

      if (created && (value == null || Object.keys(value).length == 0)) {
        value = data;
        self.setIdValue(model, value, result.lastErrorObject.upserted);
      } else {
        value = self.fromDatabase(model, value);
        self.setIdValue(model, value, value._id);
      }

      if (value && idName !== '_id') {
        delete value._id;
      }

      if (filter && filter.include) {
        self._models[model].model.include([value], filter.include, function (
          err: any,
          data: any[],
        ) {
          callback(err, data[0], created);
        });
      } else {
        callback(null, value, created);
      }
    },
  );
}

/**
 *
 * @param {*} data Plain Data Object for the matching property definition(s)
 * @param {*} modelCtorOrDef Model constructor or definition
 * @param {*} visitor A callback function which takes a property value and
 * definition to apply custom property coercion
 */
function visitAllProperties(
  data: {
    [x: string]: any
  } | null | undefined,
  modelCtorOrDef: {
    properties: any;definition: {
      properties: any
    }
  },
  visitor: {
    (propValue: any, propDef: any, setValue: any): any;
    (propValue: any, propDef: any, setValue: any): any;
    (arg0: any, arg1: any, arg2: (newValue: any) => void): void;
  },
) {
  if (data === null || data === undefined) return;
  const modelProps = modelCtorOrDef.properties ?
    modelCtorOrDef.properties :
    modelCtorOrDef.definition.properties;
  const allProps = new Set(Object.keys(data).concat(Object.keys(modelProps)));
  for (const p of allProps) {
    const value = data[p];
    const def = modelProps[p];
    if (!value) continue;
    if (def && def.type && isNestedModel(def.type)) {
      if (Array.isArray(def.type) && Array.isArray(value)) {
        for (const it of value) {
          visitAllProperties(it, def.type[0].definition, visitor);
        }
      } else {
        visitAllProperties(value, def.type.definition, visitor);
      }
    } else {
      visitor(value, def, (newValue: any) => {
        data[p] = newValue;
      });
    }
    continue;
  }
}

/**
 *
 * @param {*} propValue Property value to coerce into a Decimal128 value
 * @param {*} propDef Property definition to check if property is MongoDB
 * Decimal128 type
 */
function coerceDecimalProperty(
  propValue: {
    map: (arg0: (val: any) => any) => void
  },
  propDef: any,
  setValue: {
    (arg0: any[]): void;
    (arg0: any): void
  },
) {
  let updatedValue;
  if (hasDataType('decimal128', propDef)) {
    if (Array.isArray(propValue)) {
      updatedValue = propValue.map(val => Decimal128.fromString(val));
      return setValue(updatedValue);
    } else {
      updatedValue = Decimal128.fromString(propValue);
      return setValue(updatedValue);
    }
  }
}

/**
 * A utility function which checks for nested property definitions
 *
 * @param {*} propType Property type metadata
 *
 */
function isNestedModel(propType: any[]) {
  if (!propType) return false;
  if (Array.isArray(propType)) return isNestedModel(propType[0]);
  return propType.definition && propType.definition.properties;
}

/**
 * A utility function which checks if a certain property definition matches
 * the given data type
 * @param {*} dataType The data type to check the property definition against
 * @param {*} propertyDef A property definition containing metadata about property type
 */
function hasDataType(
  dataType: string,
  propertyDef: {
    mongodb: {
      dataType: {
        toLowerCase: () => void
      }
    }
  },
) {
  return (
    propertyDef &&
    propertyDef.mongodb &&
    propertyDef.mongodb.dataType &&
    propertyDef.mongodb.dataType.toLowerCase() === dataType.toLowerCase()
  );
}
