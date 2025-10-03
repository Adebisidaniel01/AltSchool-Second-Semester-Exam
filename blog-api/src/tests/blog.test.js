const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Blog = require('../models/blog.model');
const User = require('../models/user.model');

let token;
let userId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/blog_api_test', { useNewUrlParser: true, useUnifiedTopology: true });
  const userRes = await request(app).post('/api/auth/signup').send({
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    password: 'password123'
  });
  token = userRes.body.token;
  userId = userRes.body.user.id;
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Blog endpoints', () => {
  it('create blog (draft)', async () => {
    const res = await request(app).post('/api/blogs').set('Authorization', `Bearer ${token}`).send({
      title: 'My First Blog',
      description: 'Desc',
      body: 'This is the body of the blog with some words to compute reading time.',
      tags: ['tech', 'node']
    }).expect(201);
    expect(res.body.title).toBe('My First Blog');
    expect(res.body.state).toBe('draft');
  });

  it('publish blog and then public get increments read_count', async () => {
    // find blog
    const blog = await Blog.findOne({ title: 'My First Blog' });
    await request(app).patch(`/api/blogs/${blog._id}/state`).set('Authorization', `Bearer ${token}`).send({ state: 'published' }).expect(200);

    // fetch public endpoint (no token)
    const res = await request(app).get(`/api/blogs/${blog._id}`).expect(200);
    expect(res.body.read_count).toBeGreaterThanOrEqual(1);
  });

  it('list blogs paginated', async () => {
    const res = await request(app).get('/api/blogs?page=1&per_page=10').expect(200);
    expect(res.body.meta).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
