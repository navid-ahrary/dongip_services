// import {Filter, repository} from '@loopback/repository';
// import {get, getModelSchemaRef, param, api, HttpErrors} from '@loopback/rest';
// import {authenticate} from '@loopback/authentication';
// import {inject} from '@loopback/core';
// import {UserProfile, SecurityBindings, securityId} from '@loopback/security';

// import {UsersRels, CategoryBill} from '../models';
// import {UsersRelsRepository} from '../repositories';
// import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

// @api({
//   basePath: '/api/',
//   paths: {},
// })
// export class UsersRelsCategoryBillController {
//   constructor(
//     @repository(UsersRelsRepository)
//     public usersRelsRepository: UsersRelsRepository,
//     @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
//   ) {}

//   @get('/users-rels/{userRelId}/category-bills', {
//     summary: 'Get CategoryBills belongs to UserRel by userRelKey in path',
//     security: OPERATION_SECURITY_SPEC,
//     responses: {
//       '200': {
//         description: 'Array of UsersRels has many CategoryBill',
//         content: {
//           'application/json': {
//             schema: {
//               type: 'array',
//               items: getModelSchemaRef(CategoryBill),
//             },
//           },
//         },
//       },
//     },
//   })
//   @authenticate('jwt.access')
//   async find(
//     @param.path.number('userRelId') userRelId: typeof UsersRels.prototype.id,
//   ): Promise<CategoryBill[]> {
//     const userId = Number(this.currentUserProfile[securityId]);

//     const filter: Filter<CategoryBill> = {
//       order: ['createdAt'],
//       where: {
//         and: [{belongsToUserId: userId}, {belongsToUserRelId: userRelId}],
//       },
//     };
//     const rels = await this.usersRelsRepository
//       .categoryBills(userRelId)
//       .find(filter);

//     if (!rels.length) {
//       throw new HttpErrors.NotFound('userRelKey not found');
//     }
//     return rels;
//   }

//   // @post('/api/users-rels/{usersRelkey}/category-bills', {
//   //   security: OPERATION_SECURITY_SPEC,
//   //   responses: {
//   //     '200': {
//   //       description: 'UsersRels model instance',
//   //       content: {
//   //         'application/json': {
//   //           schema: getModelSchemaRef(CategoryBill),
//   //         },
//   //       },
//   //     },
//   //   },
//   // })
//   // @authenticate('jwt.access')
//   // async create(
//   //   @param.path.string('userRelKey')
//   //   userRelKey: typeof UsersRels.prototype._key,
//   //   @requestBody({
//   //     content: {
//   //       'application/json': {
//   //         schema: getModelSchemaRef(CategoryBill, {
//   //           title: 'NewCategoryBillInUsersRels',
//   //           exclude: ['_key'],
//   //           optional: ['belongsToUserRelId'],
//   //         }),
//   //       },
//   //     },
//   //   })
//   //   categoryBill: Omit<CategoryBill, '_key'>,
//   // ): Promise<CategoryBill> {
//   //   const relId = 'UsersRels/' + userRelKey;
//   //   return this.usersRelsRepository.categoryBills(relId).create(categoryBill);
//   // }

//   // @patch('/users-rels/{_relkey}/category-bills', {
//   //   security: OPERATION_SECURITY_SPEC,
//   //   responses: {
//   //     '200': {
//   //       description: 'UsersRels.CategoryBill PATCH success count',
//   //       content: {'application/json': {schema: CountSchema}},
//   //     },
//   //   },
//   // })
//   // @authenticate('jwt.access')
//   // async patch(
//   //   @param.path.string('_relkey') _relkey: string,
//   //   @requestBody({
//   //     content: {
//   //       'application/json': {
//   //         schema: getModelSchemaRef(CategoryBill, {partial: true}),
//   //       },
//   //     },
//   //   })
//   //   categoryBill: Partial<CategoryBill>,
//   //   @param.query.object('where', getWhereSchemaFor(CategoryBill))
//   //   where?: Where<CategoryBill>,
//   // ): Promise<Count> {
//   //   const relId = 'UsersRels/' + _relkey;
//   //   return this.usersRelsRepository
//   //     .categoryBills(relId)
//   //     .patch(categoryBill, where);
//   // }
// }
