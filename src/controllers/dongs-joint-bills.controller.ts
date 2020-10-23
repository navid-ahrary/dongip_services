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
//   JointBills,
// } from '../models';
// import {DongsRepository} from '../repositories';

// export class DongsJointBillsController {
//   constructor(
//     @repository(DongsRepository) protected dongsRepository: DongsRepository,
//   ) { }

//   @get('/dongs/{id}/joint-bills', {
//     responses: {
//       '200': {
//         description: 'Array of Dongs has many JointBills',
//         content: {
//           'application/json': {
//             schema: {type: 'array', items: getModelSchemaRef(JointBills)},
//           },
//         },
//       },
//     },
//   })
//   async find(
//     @param.path.number('id') id: number,
//     @param.query.object('filter') filter?: Filter<JointBills>,
//   ): Promise<JointBills[]> {
//     return this.dongsRepository.jointBills(id).find(filter);
//   }

//   @post('/dongs/{id}/joint-bills', {
//     responses: {
//       '200': {
//         description: 'Dongs model instance',
//         content: {'application/json': {schema: getModelSchemaRef(JointBills)}},
//       },
//     },
//   })
//   async create(
//     @param.path.number('id') id: typeof Dongs.prototype.dongId,
//     @requestBody({
//       content: {
//         'application/json': {
//           schema: getModelSchemaRef(JointBills, {
//             title: 'NewJointBillsInDongs',
//             exclude: ['jointBillId'],
//             optional: ['dongId']
//           }),
//         },
//       },
//     }) jointBills: Omit<JointBills, 'jointBillId'>,
//   ): Promise<JointBills> {
//     return this.dongsRepository.jointBills(id).create(jointBills);
//   }

//   @patch('/dongs/{id}/joint-bills', {
//     responses: {
//       '200': {
//         description: 'Dongs.JointBills PATCH success count',
//         content: {'application/json': {schema: CountSchema}},
//       },
//     },
//   })
//   async patch(
//     @param.path.number('id') id: number,
//     @requestBody({
//       content: {
//         'application/json': {
//           schema: getModelSchemaRef(JointBills, {partial: true}),
//         },
//       },
//     })
//     jointBills: Partial<JointBills>,
//     @param.query.object('where', getWhereSchemaFor(JointBills)) where?: Where<JointBills>,
//   ): Promise<Count> {
//     return this.dongsRepository.jointBills(id).patch(jointBills, where);
//   }

//   @del('/dongs/{id}/joint-bills', {
//     responses: {
//       '200': {
//         description: 'Dongs.JointBills DELETE success count',
//         content: {'application/json': {schema: CountSchema}},
//       },
//     },
//   })
//   async delete(
//     @param.path.number('id') id: number,
//     @param.query.object('where', getWhereSchemaFor(JointBills)) where?: Where<JointBills>,
//   ): Promise<Count> {
//     return this.dongsRepository.jointBills(id).delete(where);
//   }
// }
