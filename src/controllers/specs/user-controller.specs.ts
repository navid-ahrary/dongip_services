import { getModelSchemaRef } from '@loopback/rest'
import { Users } from '../../models'

// TODO(jannyHou): This should be moved to @loopback/authentication
export const UserLoginResponse = {
  '200': {
    description: 'Login user',
    content: {
      'application/josn': {
        example: {
          _key: '123456',
          _id: 'Users/123456',
          accessToken: 'abc.defghijklmnopqrstuvwyz',
          refreshToken: 'zyw.abcdefghijklmnopqrstuv'
        },
        schema: {
          type: 'object',
          properties: {
            _key: { type: 'string' },
            _id: { type: 'string' },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          }
        }
      }
    }
  }
}

export const UserVerifyResponse = {
  '200': {
    description: 'Checking this phone number has been registerd and sending verify sms',
    content: {
      'application/json': {
        example: {
          status: 'true',
          name: 'navid',
          avatar: 'avatar_10',
          prefix: 'GOD',
        },
        schema: {
          type: 'object',
          properties: {
            status: { type: 'boolean' },
            name: { type: 'string' },
            avatar: { type: 'string' },
            prefix: { type: 'string' },
          }
        }
      }
    }
  }
}

export const UserSignupRequestBody = {
  required: true,
  content: {
    'application/json': {
      example: {
        "phone": "+989332141024",
        "password": "KQM9876",
        "name": "asra",
        "locale": "fa_IR.UTF-8",
        "accountType": "personal",
        "avatar": "girl_guitar",
      },
      schema: getModelSchemaRef( Users, {
        title: 'NewUser',
        exclude: [
          "_id", "_key", "_rev", "accountType", "categories", "categoryBills",
          "dongs", "geolocation", "userAgent", "refreshToken",
          "registerationToken", "registeredAt", "usersRels", "virtualUsers"
        ]
      }
      )
    }
  }
}

export const UserSignupResponse = {
  '200': {
    description: 'User',
    content: {
      'application/json': {
        schema: getModelSchemaRef( Users, {
          exclude: [
            'userAgent', 'accountType', 'geolocation', 'phone', 'name',
            'registeredAt', 'virtualUsers', 'password', 'userAgent', '_rev',
            'locale', 'registerationToken', 'avatar'
          ]
        } )
      }
    }
  }
}

export const UserPatchRequestBody = {
  content: {
    'application/json': {
      schema: getModelSchemaRef( Users, {
        partial: true,
        exclude: [
          "_id", "_key", "_rev", "accountType", "registeredAt", "dongs",
          "usersRels", "categories", "geolocation", "phone", "virtualUsers",
          "registerationToken", "refreshToken", "usersRels", "userAgent"
        ]
      } )
    }
  }
}

// TODO(jannyHou): This is a workaround to manually
// describe the request body of 'Users/login'.
// We should either create a Credential model, or
// infer the spec from User model
export const CredentialsRequestBody = {
  description: 'The input of login function',
  required: true,
  content: {
    'application/json': {
      example: {
        phone: '+989171234567',
        password: 'BOY0069'
      },
      schema: {
        type: 'object',
        required: [ 'password', 'phone' ],
        properties: {
          password: {
            type: 'string',
            length: 7
          },
          phone: {
            type: 'string',
          }
        }
      }
    }
  }
}
