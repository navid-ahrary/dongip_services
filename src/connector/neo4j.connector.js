/* eslint-disable no-var */
'use strict';

/*!
 * Module dependencies
 */
var neo4jdb = require('neo4j-driver').v1;
var g = require('strong-globalize')();
var util = require('util');
var uuid = require('uuid');
var Neo4jConnector = require('loopback-connector').Connector;
var debug = require('debug')('loopback:connector:neo4jdb');

exports.generateNeo4jDBURL = generateNeo4jDBURL;
/*!
 * Generate the Neo4j URL from the options
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
 * The constructor for Neo4j connector
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
function Neo4jDB(settings, dataSource) {
  this.dataSource = dataSource;
  Neo4jConnector.call(this, 'neo4j', settings);
  this.debug = settings.debug || debug.enabled;
  if (this.debug) {
    debug("Constructor:settings: %j", settings);
  }
}

util.inherits(Neo4jDB, Neo4jConnector);

/**
 * Connect to Neo4j
 * @param {Function} [callback] The callback function
 *
 * @callback callback
 * @param {Error} err The error object
 * @param {Db} db The neo4j object
 * @param {Object} config The driver config object
 */
Neo4jDB.prototype.connect = function () {
  var self = this;

  const validOptionNames = [
    'auth',
    'user',
    'password',
    'authMechanism',
    'authSource',
    'server',
    'db',
    'config'
  ];

  const lbOptions = Object.keys(self.settings);
  // eslint-disable-next-line prefer-const
  var validOptions = {};
  lbOptions.forEach(function (option) {
    if (validOptionNames.indexOf(option) > -1) {
      validOptions[option] = self.settings[option];
    }
  });
  debug('Valid options: %j', validOptions);

  const authMechanism = neo4jdb.auth.basic || self.authMechanism;

  var driver = neo4jdb.driver({
    'url': self.settings.url,
    'authToken': authMechanism(self.settings.username, self.settings.password),
    'config': self.settings.config
  })

  driver.onCompleted = () => {
    if (self.debug) {
      debug('Neo4j connection is established: ' + self.settings.url);
    }
  }

  driver.onError = error => {
    g.err('{{Neo4j}} connection is failed: %s %s',
      self.settings.url,
      error,
    )
  }
}

Neo4jDB.prototype.getTypes = function () {
  return ['db', 'graph', 'neo4j', 'nosql', this.name];
};

/**
 * Get collection name for a given model
 * @param {String} model Model name
 * @returns {String} collection name
 */
Neo4jDB.prototype.collectionName = function (model) {
  var modelClass = this._models[model];
  if (modelClass.settings.neo4jdb) {
    model = modelClass.settings.neo4jdb.collection || model;
  }
  return model;
};

/**
 * Access a MongoDB collection by model name
 * @param {String} model The model name
 * @returns {*}
 */
Neo4jDB.prototype.collection = function (model) {
  if (!this.db) {
    throw new Error(g.f('{{Neo4j}} connection is not established'));
  }
  const collectionName = this.collectionName(model);
  return this.db.collection(collectionName);
};


/**
 * Get label for a given model.
 *
 * @param {string} model - Model name
 * @returns {string}
 */
Neo4jDB.prototype.label = function (model) {
  var self = this;
  return model.settings.neo4jlab;
};

/**
 * Get ID name for a given model.
 *
 * @param {string} model - Model name
 * @returns {string}
 */
Neo4jDB.prototype.getIdName = function (model) {
  return this.idName(model) || "id";
};


/**
 * Convert the data from database to JSON.
 *
 * @param {string} model - The model name
 * @param {Object} data - The data from DB
 */
Neo4jDB.prototype.fromDatabase = function (model, data) {
  var self = this,
    dateFields = {
      "created": 1,
      "lastUpdated": 1
    },
    dateObject = {},
    properties = self.getModelDefinition(model).properties,
    propertyNames = Object.keys(properties);

  if (self.debug) {
    debug("fromDatabase:model:%s,data:%j", model, data);
  }
  if (!data) {
    return null;
  }
  propertyNames.forEach(function (p) {
    var prop = properties[p];

    if (self.debug) {
      debug("fromDatabase:p:%s,prop:%j", p, prop);
    }
    if (data[p]) {
      if (self.debug) {
        debug("fromDatabase:value present:%s", p);
      }
      if (dateFields[p]) {
        // We need to convert date strings to date since Neo4j doesn't support date type
        // at the time of writing this.
        if (self.debug) {
          debug("fromDatabase:date field");
        }
        try {
          dateObject = new Date(data[p]);
          data[p] = dateObject;
        } catch (e) {
          if (self.debug) {
            debug("fromDatabase:date exception2:%j", e);
          }
        }
      } else if (prop.type) {
        if (self.debug) {
          debug("fromDatabase:property type:%j", prop.type);
        }
        // We need to convert date strings to date since Neo4j doesn't support date type
        // at the time of writing this.
        if ("Date" === prop.type) {
          if (self.debug) {
            debug("fromDatabase:date type");
          }
          try {
            dateObject = new Date(data[p]);
            data[p] = dateObject;
          } catch (e) {
            if (self.debug) {
              debug("fromDatabase:date exception1:%j", e);
            }
          }
        }
      }
    }
  });
  return data;
};

/**
 * Create a new model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} [callback] The callback function
 */
Neo4jDB.prototype.create = function (model, data, options) {
  var self = this,
    session = self.driver.session(),
    idName = self.getIdName(model);

  if (self.debug) {
    debug("create:model:%s,data:%j,options:%j", model, data, options);
  }
  // always inject id if it's not present in data
  if (!data[idName]) {
    data[idName] = uuid.v4();
  }

  session.run(`CREATE (${model}: ${model} {properties: $properties})`, {
    properties: options
  }).then((result) => {
    session.close();
    if (self.debug) {
      debug("create:result:%j", result);
    }
    session.close();
  })
};

/**
 * Save (update) the model instance for the given data.
 * Save with given properties overwriting existing ones.
 *
 * @param {string} model - The model name
 * @param {Object} data - The model data
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.save = function (model, data, options) {
  var self = this,
    session = self.driver.session(),
    idName = self.getIdName(model),
    params = {};

  if (self.debug) {
    debug("save:model:%s,data:%j,options:%j", model, data, options);
  }
  // always inject id if it's not present in data
  if (!data[idName]) {
    data[idName] = uuid.v4();
  }
  params[idName] = data[idName];
  params.properties = data;
  session.run({
    "query": "MERGE (n:" + self.label(model) + " {" + idName + ": {id}}) ON CREATE SET n = {properties} ON MATCH SET n = {properties} RETURN n",
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("save:response:%j", result);
    }
    session.close();
  });
}

/**
 * Update if the model instance exists with the same id or create a new instance.
 * Update adds new properties without removing existing ones.
 *
 * @param {string} model - The model name
 * @param {Object} data - The model instance data
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.updateOrCreate = function (model, data, options, callback) {
  var self = this,
    session = self.driver.session(),
    idName = self.getIdName(model),
    params = {};

  if (self.debug) {
    debug("updateOrCreate:model:%s,id:%j,options:%j", model, data, options);
  }
  // always inject id if it's not present in data
  if (!data[idName]) {
    data[idName] = uuid.v4();
  }
  params[idName] = data[idName];
  params.properties = data;
  session.run({
    "query": "MERGE (n:" + self.label(model) + " {" + idName + ": {id}}) ON CREATE SET n = {properties} ON MATCH SET n += {properties} RETURN n",
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("updateOrCreate: result:%j", result);
    }
    session.close();
  });
}

/**
 * Check if a model instance exists by id.
 *
 * @param {string} model - The model name
 * @param {*} id - The id value
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 *
 */
Neo4jDB.prototype.exists = function (model, id, options) {
  var self = this,
    session = self.driver.session(),
    idName = self.getIdName(model),
    params = {};

  if (self.debug) {
    debug("exists:model:%s,id:%j,options:%j", model, id, options);
  }
  params[idName] = id;
  params.idName = idName;

  session.run({
    "query": "MATCH (n:" + self.label(model) + " {" + idName + ": {id}}) RETURN n.{idName}",
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("exists:result:%j", result);
    }
    session.close();
  });
}

/**
 * Find a model instance by id.
 *
 * @param {string} model - The model name
 * @param {*} id - The id value
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.find = function (model, id, options) {
  var self = this,
    session = self.driver.session(),
    idName = self.getIdName(model),
    params = {};

  if (self.debug) {
    debug("find:model:%s,id:%j,options:%j", model, id, options);
  }
  params[idName] = id;

  session.run({
    "query": "MATCH (n:" + self.label(model) + " {" + idName + ": {id}}) RETURN n",
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("find:result:%j", result);
    }
    session.close();

  });
};


Neo4jConnector.defineAliases(Neo4jDB.prototype, 'find', 'findById');

/**
 * Find one matching model instance by the filter.
 *
 * @param {string} model - The model name
 * @param {Object} filter - The filter
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.findOne = function (model, filter, options) {
  var self = this,
    session = self.driver.session(),
    query = "MATCH (n:" + self.label(model) + ")",
    params = {},
    where = {},
    fields = [];

  if (self.debug) {
    debug("findOne:model:%s,filter:%j,options:%j", model, filter, options);
  }
  filter = filter || {};
  if (filter.where) {
    if (self.debug) {
      debug("findOne:where:%j", where);
    }
    if (where.query) {
      query += " WHERE" + where.query;
      params = where.params;
    }
  }
  query += " RETURN n";
  if (filter.fields) {
    if ("string" === typeof filter.fields) {
      fields = filter.fields.split(",");
    } else if (Array.isArray(filter.fields)) {
      fields = filter.fields;
    } else {
      // Object
      fields = Object.keys(filter.fields).filter(function (key) {
        return filter.fields[key];
      });
    }
    query += "." + fields.join(", n.");
  }
  query += " LIMIT 1";
  if (self.debug) {
    debug("findOne:query:%s", query);
  }
  session.run({
    "query": query,
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("findOne:result:%j", result);
    }
    session.close();
  });
}


/**
 * Delete a model instance by id.
 * NOTE: deleting a node will delete all it's relations as well.
 * If the existence of relations need to be caught, execute delete cypher query manually.
 *
 * @param {string} model - The model name
 * @param {*} id - The id value
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.destroy = function (model, id, options) {
  var self = this,
    session = self.driver.session(),
    idName = self.getIdName(model),
    params = {};

  if (self.debug) {
    debug("destroy:model:%s,id:%j,options:%j", model, id, options);
  }
  params[idName] = id;

  session.run({
    "query": "MATCH (n:" + self.label(model) + " {" + idName + ": {id}}) DETACH DELETE n",
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("destroy:result:%j", result);
    }
    session.close();
  });
};

/**
 * Find matching model instances by the filter.
 * TODO: include filter.
 *
 * @param {string} model - The model name
 * @param {Object} filter - The filter
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.all = function (model, filter, options, callback) {
  var self = this,
    session = self.driver.session(),
    query = "MATCH (n:" + self.label(model) + ")",
    params = {},
    where = {},
    order = "",
    fields = [];

  if (self.debug) {
    debug("all:model:%s,filter:%j,options:%j", model, filter, options);
  }
  filter = filter || {};

  if (self.debug) {
    debug("all:where:%j", where);
  }
  if (where.query) {
    query += " WHERE" + where.query;
    params = where.params;
  }

  query += " RETURN n";
  if (filter.fields) {
    if ("string" === typeof filter.fields) {
      fields = filter.fields.split(",");
    } else if (Array.isArray(filter.fields)) {
      fields = filter.fields;
    } else {
      // Object
      fields = Object.keys(filter.fields).filter(function (key) {
        return filter.fields[key];
      });
    }
    fields = fields.map(function (field) {
      return field + " AS " + field;
    });
    query += "." + fields.join(", n.");
  }
  if (filter.order) {
    query += " ORDER BY" + order;
  }
  if (filter.skip) {
    query += " SKIP {skip}";
    params.skip = filter.skip;
  }
  if (filter.limit) {
    query += " LIMIT {limit}";
    params.limit = filter.limit;
  }
  if (self.debug) {
    debug("all:query:%s", query);
  }

  session.run({
    "query": query,
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("all:result:%j", result);
    }
    session.close();
  });
};

/**
 * Delete all instances for the given model.
 *
 * @param {string} model - The model name
 * @param {Object} where - The where conditions
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.destroyAll = function (model, where, options, callback) {
  var self = this,
    session = self.driver.session(),
    query = "MATCH (n:" + self.label(model) + ")",
    params = {},
    cypher = {};

  if (self.debug) {
    debug("destroyAll:model:%s,where:%j,options:%j", model, where, options);
  }
  if (where) {
    cypher = where;
    if (self.debug) {
      debug("destroyAll:where:%j", cypher);
    }
    if (cypher.query) {
      query += " WHERE" + cypher.query;
      params = cypher.params;
    }
  }
  query += " DETACH DELETE n RETURN COUNT(n) AS count";
  if (self.debug) {
    debug("all:query:%s", query);
  }

  session.run({
    "query": query,
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("destroyAll:result:%j", result);
    }
    session.close()
  });
};

/**
 * Count the number of instances for the given model.
 *
 * @param {string} model - The model name
 * @param {Object} where - The where conditions
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 *
 */
Neo4jDB.prototype.count = function (model, where, options) {
  var self = this,
    session = self.driver.session(),
    query = "MATCH (n:" + self.label(model) + ")",
    params = {},
    cypher = {};

  if (self.debug) {
    debug("count:model:%s,where:%j,options:%j", model, where, options);
  }
  if (where) {
    query += " WHERE" + where;
    if (self.debug) {
      debug("count:where:%j", cypher);
    }

  }
  query += " RETURN COUNT(n) AS count";

  session.run({
    "query": query,
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("coubt:result:%j", result);
    }
    session.close();
  });
};

/**
 * Update properties for the model instance data.
 *
 * @param {string} model - The model name
 * @param {*} id - The id value
 * @param {Object} data - The model data
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.updateAttributes = function (model, id, data, options, callback) {
  var self = this,
    session = self.driver.session(),
    idName = self.getIdName(model),
    params = {};

  if (self.debug) {
    debug("updateAttributes:model:%s,id:%j,data:%j,options:%j", model, id, data, options);
  }
  params[idName] = id;
  params.properties = data;
  session.run({
    "query": "MATCH (n:" + self.label(model) + " {" + idName + ": {id}}) SET n += {properties} RETURN n",
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("updateAttributes:result:%j", result);
    }
    session.close();
  });
};

/**
 * Replace properties for the model instance data.
 *
 * @param {string} model - The model name
 * @param {*} id - The id value
 * @param {Object} data - The model data
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.replaceById = function (model, id, data, options) {
  var self = this,
    session = self.driver.session(),
    idName = self.getIdName(model),
    params = {};

  if (self.debug) {
    debug("replaceById:model:%s,id:%j,data:%j,options:%j", model, id, data, options);
  }
  params[idName] = id;
  params.properties = data;

  session.run({
    "query": "MATCH (n:" + self.label(model) + " {" + idName + ": {id}}) SET n = {properties} RETURN n",
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("replaceById: result:%j", result);
    }
    session.close();
  });
};

/**
 * Update all matching instances.
 *
 * @param {string} model - The model name
 * @param {Object} where - The search criteria
 * @param {Object} data - The property/value pairs to be updated
 * @param {Object} options - The model options
 * @param {Function} callback - The callback function
 */
Neo4jDB.prototype.updateAll = function (model, where, data, options) {
  var self = this,
    session = self.driver.session(),
    query = "MATCH (n:" + self.label(model) + ")",
    params = {},
    cypher = {};

  if (self.debug) {
    debug("updateAll:model:%s,where:%j,data:%j,options:%j", model, where, data, options);
  }
  if (where) {
    cypher = self.buildWhere(where);
    if (self.debug) {
      debug("updateAll:where:%j", cypher);
    }
    if (cypher.query) {
      query += " WHERE" + cypher.query;
      params = cypher.params;
    }
  }
  query += " SET n += {properties} RETURN COUNT(n) AS count";
  params.properties = data;
  self.db.cypher({
    "query": query,
    "params": params
  }).then(result => {
    if (self.debug) {
      debug("updateAll:result:%j", result);
    }
    session.close();
  });
};

Neo4jDB.prototype.update = Neo4jDB.prototype.updateAll;

/**
 * Execute cypher queries.
 *
 * @param {String|Object} command - The cypher query
 * @param {*[]} params - An array of parameter values (unused)
 * @param {Object} options - the options
 * @param {Function} callback - the callback function
 */
Neo4jDB.prototype.execute = function (query) {
  var self = this,
    session = self.driver.session();
  if (self.debug) {
    debug("execute:cypher:%j", cypher);
  }
  return session.run(query);
};



/**
 * Begin a transaction. Returns the Neo4j transaction object.
 * Note that this is not an implementation of native loopback transactions,
 * just a wrapper for using Neo4j transactions.
 *
 * @returns {Object}
 */
Neo4jDB.prototype.startTransaction = function () {
  return this.driver.transaction;
};
