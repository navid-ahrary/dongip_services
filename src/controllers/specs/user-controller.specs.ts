import {getModelSchemaRef} from '@loopback/rest';
import {Users, Verify} from '../../models';

export const UserLoginResponse = {
  '200': {
    description: 'Login user',
    content: {
      'application/josn': {
        schema: {
          type: 'object',
          properties: {
            _key: {type: 'string'},
            _id: {type: 'string'},
            accessToken: {type: 'string'},
            refreshToken: {type: 'string'},
          },
        },
      },
    },
  },
};

export const VerifyPhoneRequestBody = {
  description: 'Verify phone number',
  required: true,
  content: {
    'application/json': {
      schema: getModelSchemaRef(Verify, {
        partial: false,
        exclude: ['_key', 'agent', 'password', 'issuedAt', 'registered'],
      }),
    },
  },
};

export const VerifyPhoneResponse = {
  '200': {
    description:
      'Checking this phone number has been registered and sending verify sms',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: {type: 'boolean'},
            name: {type: 'string'},
            avatar: {type: 'string'},
            prefix: {type: 'string'},
          },
        },
      },
    },
  },
};

export const UserSignupRequestBody = {
  required: true,
  content: {
    'application/json': {
      schema: getModelSchemaRef(Users, {
        title: 'NewUser',
        exclude: [
          '_id',
          '_key',
          '_rev',
          'accountType',
          'categories',
          'categoryBills',
          // 'dongs',
          'userAgent',
          'refreshToken',
          'registerationToken',
          'registeredAt',
          'usersRels',
          'virtualUsers',
        ],
      }),
    },
  },
};

export const UserSignupResponse = {
  '200': {
    description: 'User',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Users, {
          exclude: [
            'userAgent',
            'accountType',
            'phone',
            'name',
            'registeredAt',
            'virtualUsers',
            'password',
            'userAgent',
            '_rev',
            'registerationToken',
            'avatar',
          ],
        }),
      },
    },
  },
};

export const UserPatchRequestBody = {
  content: {
    'application/json': {
      schema: getModelSchemaRef(Users, {
        partial: true,
        exclude: [
          '_id',
          '_key',
          '_rev',
          'accountType',
          'registeredAt',
          // 'dongs',
          'usersRels',
          'categories',
          'phone',
          'virtualUsers',
          'registerationToken',
          'refreshToken',
          'usersRels',
          'userAgent',
          'password',
        ],
      }),
      examples: {
        multiProps: {
          summary: 'Update some properties',
          value: {
            name: 'Aref',
            avatar: 'assets/avatar/avatar_1.png',
          },
        },
        sigleProp: {
          summary: 'Update a property',
          value: {
            avatar: 'assets/avatar/avatar_1.png',
          },
        },
      },
    },
  },
};

export const CredentialsRequestBody = {
  description: 'The input of login function',
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['password', 'phone'],
        properties: {
          password: {
            type: 'string',
            length: 9,
          },
          phone: {
            type: 'string',
          },
        },
      },
    },
  },
};
