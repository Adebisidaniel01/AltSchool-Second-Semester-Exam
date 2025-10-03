const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/user.model');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/blog_api_test', { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Auth', () => {
  it('signup -> returns token & user', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    }).expect(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('john@example.com');
  });

  it('signin -> returns token', async () => {
    const res = await request(app).post('/api/auth/signin').send({
      email: 'john@example.com',
      password: 'password123'
    }).expect(200);
    expect(res.body.token).toBeDefined();
  });
});
