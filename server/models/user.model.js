'use strict';

const modelDefinition = {
  'properties': {
    // By convetion "id" property should be the id of the model
    'id': {
      'type': 'string',
      'required': true
    },
    'name': {
      'type': 'string',
      'required': true
    },
    'createdDate': {
      'type': 'string',
      'required': true
    }
  },
  // Supporting these additional features would be a lot of additional work
  // and some features are still not available in LB4, yet
  'validations': [],
  'relations': {},
  'acls': [],
  'methods': {}
}

exports.User = modelFactory('User', modelDefinition);
