// import {Entity, model, property, belongsTo} from '@loopback/repository';

// import {Category, Dong, Users, UsersRels} from './';

// @model()
// export class CategoryBill extends Entity {
//   @property({
//     type: 'number',
//     id: true,
//     generated: true,
//     required: false,
//   })
//   categoryBillId: number;

//   @belongsTo(() => Dong, {name: 'belongsToDong'})
//   dongId: typeof Dong.prototype.dongId;

//   @belongsTo(() => Category, {name: 'belongsToCategory'})
//   categoryId: typeof Category.prototype.categoryId;

//   @belongsTo(() => Users, {name: 'belongsToUser'})
//   userId: typeof Users.prototype.userId;

//   @belongsTo(() => UsersRels, {name: 'belongsToUserRel'})
//   usersRlId: typeof UsersRels.prototype.userRelId;

//   @property({
//     type: 'number',
//     requred: false,
//   })
//   dongAmount: number;

//   @property({
//     type: 'number',
//     required: true,
//   })
//   paidAmount: number;

//   @property({
//     type: 'boolean',
//     required: true,
//   })
//   settled: boolean;

//   @property({
//     type: 'string',
//     required: false,
//   })
//   settledAt?: string;

//   @property({
//     type: 'string',
//     requried: true,
//   })
//   createdAt: string;

//   constructor(data?: Partial<CategoryBill>) {
//     super(data);
//   }
// }

// export interface CategoryBillRelations {}

// export type CategoryBillWithRelations = CategoryBill & CategoryBillRelations;
