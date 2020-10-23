// import {
//   Count,
//   CountSchema,
//   Filter,
//   repository,
//   Where,
// } from '@loopback/repository';
// import {
//   del,
//   get,
//   getModelSchemaRef,
//   getWhereSchemaFor,
//   param,
//   patch,
//   post,
//   requestBody,
// } from '@loopback/rest';
// import {
//   Dongs,
//   JointPayers,
// } from '../models';
// import {DongsRepository} from '../repositories';

// export class DongsJointPayersController {
//   constructor(
//     @repository(DongsRepository) protected dongsRepository: DongsRepository,
//   ) { }

//   @get('/dongs/{id}/joint-payers', {
//     responses: {
//       '200': {
//         description: 'Array of Dongs has many JointPayers',
//         content: {
//           'application/json': {
//             schema: {type: 'array', items: getModelSchemaRef(JointPayers)},
//           },
//         },
//       },
//     },
//   })
//   async find(
//     @param.path.number('id') id: number,
//     @param.query.object('filter') filter?: Filter<JointPayers>,
//   ): Promise<JointPayers[]> {
//     return this.dongsRepository.jointPayers(id).find(filter);
//   }

//   @post('/dongs/{id}/joint-payers', {
//     responses: {
//       '200': {
//         description: 'Dongs model instance',
//         content: {'application/json': {schema: getModelSchemaRef(JointPayers)}},
//       },
//     },
//   })
//   async create(
//     @param.path.number('id') id: typeof Dongs.prototype.dongId,
//     @requestBody({
//       content: {
//         'application/json': {
//           schema: getModelSchemaRef(JointPayers, {
//             title: 'NewJointPayersInDongs',
//             exclude: ['jointBillId'],
//             optional: ['dongId']
//           }),
//         },
//       },
//     }) jointPayers: Omit<JointPayers, 'jointBillId'>,
//   ): Promise<JointPayers> {
//     return this.dongsRepository.jointPayers(id).create(jointPayers);
//   }

//   @patch('/dongs/{id}/joint-payers', {
//     responses: {
//       '200': {
//         description: 'Dongs.JointPayers PATCH success count',
//         content: {'application/json': {schema: CountSchema}},
//       },
//     },
//   })
//   async patch(
//     @param.path.number('id') id: number,
//     @requestBody({
//       content: {
//         'application/json': {
//           schema: getModelSchemaRef(JointPayers, {partial: true}),
//         },
//       },
//     })
//     jointPayers: Partial<JointPayers>,
//     @param.query.object('where', getWhereSchemaFor(JointPayers)) where?: Where<JointPayers>,
//   ): Promise<Count> {
//     return this.dongsRepository.jointPayers(id).patch(jointPayers, where);
//   }

//   @del('/dongs/{id}/joint-payers', {
//     responses: {
//       '200': {
//         description: 'Dongs.JointPayers DELETE success count',
//         content: {'application/json': {schema: CountSchema}},
//       },
//     },
//   })
//   async delete(
//     @param.path.number('id') id: number,
//     @param.query.object('where', getWhereSchemaFor(JointPayers)) where?: Where<JointPayers>,
//   ): Promise<Count> {
//     return this.dongsRepository.jointPayers(id).delete(where);
//   }
// }
