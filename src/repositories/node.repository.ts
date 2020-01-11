import {DefaultCrudRepository} from '@loopback/repository';
import {Node, NodeRelations} from '../models';
import {Neo4JDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class NodeRepository extends DefaultCrudRepository<
  Node,
  typeof Node.prototype.id,
  NodeRelations
> {
  constructor(
    @inject('datasources.neo4j') dataSource: Neo4JDataSource,
  ) {
    super(Node, dataSource);
  }
}
