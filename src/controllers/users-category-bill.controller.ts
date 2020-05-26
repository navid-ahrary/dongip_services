// /* eslint-disable prefer-const */
// import {Filter, repository} from '@loopback/repository';
// import {get, getModelSchemaRef, param, HttpErrors, api} from '@loopback/rest';
// import {inject} from '@loopback/core';
// import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
// import {authenticate} from '@loopback/authentication';

// import {CategoryBill} from '../models';
// import {UsersRepository, UsersRelsRepository} from '../repositories';
// import {OPERATION_SECURITY_SPEC} from '../utils/security-specs';

// @api({
//   basePath: '/api/',
//   paths: {},
// })
// export class UsersCategoryBillController {
//   constructor(
//     @repository(UsersRepository) protected usersRepository: UsersRepository,
//     @repository(UsersRelsRepository)
//     protected userRelRepository: UsersRelsRepository,
//     @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
//   ) {}

//   private checkUserKey(key: string) {
//     if (key !== this.currentUserProfile[securityId]) {
//       throw new HttpErrors.Unauthorized(
//         'Token is not matched to this user _key!',
//       );
//     }
//   }

//   @get('/category-bills', {
//     security: OPERATION_SECURITY_SPEC,
//     responses: {
//       '200': {
//         description: 'Array of Users has many CategoryBill',
//         content: {
//           'application/json': {
//             schema: {type: 'array', items: getModelSchemaRef(CategoryBill)},
//           },
//         },
//       },
//     },
//   })
//   @authenticate('jwt.access')
//   async find(
//     @param.query.object('filter') filter?: Filter<CategoryBill>,
//   ): Promise<CategoryBill[]> {
//     let _userKey = this.currentUserProfile[securityId],
//       userId = 'Users/' + _userKey,
//       categoryBillList: CategoryBill[] = [];

//     const userSelfRel = await this.userRelRepository.findOne({
//       where: {_from: userId},
//     });

//     if (userSelfRel) {
//       categoryBillList = await this.usersRepository
//         .categoryBills(userSelfRel._from)
//         .find(filter);
//     }
//     return categoryBillList;
//   }

// @post('/api/users/category-bills', {
//   security: OPERATION_SECURITY_SPEC,
//   responses: {
//     '200': {
//       description: 'Users model instance',
//       content: {
//         'application/json': {
//           schema: getModelSchemaRef(CategoryBill),
//         },
//       },
//     },
//   },
// })
// @authenticate('jwt.access')
// async create(
//   @requestBody({
//     content: {
//       'application/json': {
//         schema: getModelSchemaRef(CategoryBill, {
//           title: 'NewCategoryBillInUsers',
//           exclude: ['_key'],
//           optional: ['_from'],
//         }),
//       },
//     },
//   })
//   categoryBill: Omit<CategoryBill, '_key'>,
// ): Promise<CategoryBill> {
//   const _userKey = this.currentUserProfile[securityId];
//   const userId = 'Users/' + _userKey;

//   return this.usersRepository.categoryBills(userId).create(categoryBill);
// }
// }
