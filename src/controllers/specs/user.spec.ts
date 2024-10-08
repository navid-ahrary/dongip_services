import { getModelSchemaRef } from '@loopback/rest';
import { Users } from '../../models';

export const UserPatchRequestBody = {
  content: {
    'application/json': {
      schema: getModelSchemaRef(Users, {
        partial: true,
        exclude: [
          'userId',
          'roles',
          'registeredAt',
          'dongs',
          'usersRels',
          'categories',
          'firebaseToken',
          'usersRels',
          'userAgent',
          'phoneLocked',
          'emailLocked',
          'isCompleted',
          'deleted',
        ],
        optional: ['phone', 'email'],
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
