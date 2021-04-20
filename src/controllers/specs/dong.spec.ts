import { getModelSchemaRef, RequestBodyObject } from '@loopback/rest';
import { Dongs, PostDong } from '../../models';

export const createDongReqBodySpec: RequestBodyObject = {
  content: {
    'application/json': {
      schema: getModelSchemaRef(PostDong, {
        title: 'NewDongs',
        optional: ['title', 'desc', 'jointAccountId', 'currency'],
      }),
      example: {
        title: 'New dong',
        desc: 'Dongip it',
        createdAt: new Date(),
        categoryId: 88,
        jointAccountId: 6,
        pong: 80000,
        currency: 'IRR',
        sendNotify: true,
        includeBill: true,
        receiptId: 100,
        payerList: [{ userRelId: 1, paidAmount: 40000 }],
        billList: [
          { userRelId: 1, dongAmount: 20000 },
          { userRelId: 9, dongAmount: 20000 },
        ],
      },
    },
  },
};

export const patchDongsReqBodySpec: RequestBodyObject = {
  content: {
    'application/json': {
      schema: getModelSchemaRef(Dongs, {
        title: 'PatchDongs',
        optional: ['userId', 'categoryId'],
        exclude: [
          'createdAt',
          'currency',
          'originDongId',
          'dongId',
          'pong',
          'jointAccountId',
          'includeBill',
          'includeBudget',
        ],
      }),
      example: { categoryId: 202 },
    },
  },
};
