import { getModelSchemaRef, RequestBodyObject } from '@loopback/rest';
import { PostDongDto } from '../../models';

export const createDongReqBodySpec: RequestBodyObject = {
  content: {
    'application/json': {
      schema: getModelSchemaRef(PostDongDto, {
        title: 'NewDongs',
        optional: ['title', 'desc', 'jointAccountId', 'currency', 'income'],
      }),
      examples: {
        expense: {
          value: {
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
        income: {
          value: {
            title: 'New dong',
            desc: 'Dongip it',
            createdAt: new Date(),
            categoryId: 88,
            jointAccountId: 6,
            pong: 20000,
            currency: 'IRT',
            sendNotify: false,
            includeBill: false,
            income: true,
            receiptId: 100,
            walletId: 223,
            payerList: [{ userRelId: 1, paidAmount: 20000 }],
            billList: [{ userRelId: 1, dongAmount: 20000 }],
          },
        },
      },
    },
  },
};
