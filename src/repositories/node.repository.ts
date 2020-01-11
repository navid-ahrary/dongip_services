import { DefaultCrudRepository } from '@loopback/repository';
import { Node, NodeRelations } from '../models';
import { ArangodbDataSource } from '../datasources';
import { inject } from '@loopback/core';

export class NodeRepository extends DefaultCrudRepository<
  Node,
  typeof Node.prototype.id,
  NodeRelations
  > {
  constructor(
    @inject('datasources.arangodb') dataSource: ArangodbDataSource,
  ) {
    super(Node, dataSource);
  }
}
