export const PostNewDongExample = {
  title: 'عروسی عارف',
  desc: 'مهمونی عروسی عارف جمعه',
  createdAt: new Date().toISOString(),
  categoryId: 1,
  groupId: 12,
  pong: 80000,
  sendNotify: true,
  payerList: [{userRelId: 1, paidAmount: 80000}],
  billList: [
    {userRelId: 1, dongAmount: 20000},
    {userRelId: 2, dongAmount: 20000},
    {userRelId: 3, dongAmount: 20000},
    {userRelId: 4, dongAmount: 20000},
  ],
};
