import { getModelSchemaRef, RequestBodyObject } from '@loopback/rest';
import { PostDong } from '../../models';

export const dongReqBody: RequestBodyObject = {
  content: {
    'application/json': {
      schema: getModelSchemaRef(PostDong, {
        title: 'NewDongs',
        optional: ['title', 'desc', 'groupId', 'currency'],
      }),
      example: {
        title: 'New dong',
        desc: 'Dongip it',
        createdAt: new Date(),
        categoryId: 1,
        pong: 80000,
        currency: 'IRR',
        sendNotify: true,
        payerList: [{ userRelId: 1, paidAmount: 80000 }],
        billList: [
          { userRelId: 1, dongAmount: 20000 },
          { userRelId: 2, dongAmount: 20000 },
          { userRelId: 3, dongAmount: 20000 },
          { userRelId: 4, dongAmount: 20000 },
        ],
      },
    },
  },
};
