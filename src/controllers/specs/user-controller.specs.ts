// TODO(jannyHou): This should be moved to @loopback/authentication
export const UserProfileSchema = {
  type: 'object',
  required: ['mobile', 'name'],
  properties: {
    mobile: {type: 'string'},
    name: {type: 'string'},
  },
};

// TODO(jannyHou): This is a workaround to manually
// describe the request body of 'Users/login'.
// We should either create a Credential model, or
// infer the spec from User model

const CredentialsSchema = {
  type: 'object',
  required: ['phone', 'password', 'registerationToken'],
  properties: {
    phone: {
      type: 'string',
    },
    password: {
      type: 'string',
      length: 4,
    },
    registerationToken: {
      type: 'string',
    },
  },
};

export const CredentialsRequestBody = {
  description: 'The input of login function',
  required: true,
  content: {
    'application/json': {schema: CredentialsSchema},
  },
};
