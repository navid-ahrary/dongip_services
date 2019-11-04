'use strict';

const fs = require('fs');
const path = require('path');
const supertest = require('supertest');
const server = require('../server');

describe('CRUD API', () => {
  let app, request;

  beforeEach(async () => {
    const dbFilePath = path.join(__dirname, '../db.json');
    if (fs.existsSync(dbFilePath)) fs.unlinkSync(dbFilePath);

    app = await server.start({
      silent: true,
      rest: {
        port: 0
      }
    });

    request = supertest.agent(app.restServer.url);
  });

  afterEach(async () => {
    await app.stop();
  });

  it('should handle GET /user/count', (done) => {
    request
      .get('/user/count')
      .expect('Content-Type', /json/)
      .expect(200, {
        count: 0
      }, done);
  });

  it('should handle POST /user', (done) => {
    request
      .post('/user')
      .set('Content-Type', 'application/json')
      .send({
        value: 'Red'
      })
      .expect('Content-Type', /json/)
      .expect(200, {
        id: 1,
        value: 'Red'
      }, done);
  });

});
