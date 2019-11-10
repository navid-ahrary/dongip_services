# loopback-connector-neo4j-graph

## Introduction

Cypher based Neo4j connector for loopback-datasource-juggler using the [node-neo4j](https://github.com/thingdom/node-neo4j) Neo4j REST API client library. This loopback connector was developed by referring to the codebase of [loopback-connector-mongodb](https://github.com/strongloop/loopback-connector-mongodb). Thanks to all the nodejs open source community, developers and contributors of the above libraries and others that made this possible. Thanks to the contributors and users of this library as well.

## Install

Change to your project directory and execute:

```Shell
npm install --save loopback-connector-neo4j-graph
```

## Test

After install, change to the module directory and run **npm test**. Make sure Neo4j service is running on localhost.

```Shell
cd node_modules/loopback-connector-neo4j-graph
npm test
```

## Sample Configuration

Add neo4j in server/datasources.json

```JSON
"neo4j": {
        "port": 7474,
        "username": "neo4j",
        "password": "neo4j",
        "name": "neo4j",
        "connector": "neo4j-graph",
        "hostname": "127.0.0.1"
    }
```

## Usage

Model objects would work just like in MongoDB. However, relations will not be mapped to graph vertices as of now.
Use cypher for creating vertices and for graph queries.

## Executing cypher

Replace "ModelClass" in the following examples with the name of the model class being used.

### Simple queries

```Javascript
ModelClass.dataSource.connector.execute(
    "MATCH (n) RETURN n LIMIT 100",
    function (err, results) {
        if (err) {
            throw err;
        } else {
            // do something with results
        }
    }
);
```

### Queries with parameters

```Javascript
var cypher = {
    query: "MATCH (u:User {email: {email}}) RETURN u",
    params: {
        email: 'alice@example.com',
    }
};
var options = {};
var callback = function (err, results) {
    if (err) {
        throw err;
    }
    var result = results[0];
    if (!result) {
        console.log('No user found.');
    } else {
        var user = result['u'];
        console.log(JSON.stringify(user, null, 4));
    }
};

ModelClass.dataSource.connector.execute(
    cypher,
    [],
    options,
    callback
);
```

Note: For transactional queries, the transaction may be passed in options.tx