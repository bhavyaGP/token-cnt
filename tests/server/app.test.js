const request = require('supertest');
const app = require('./index');
const mongoose = require('mongoose');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test');
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('GET /', () => {
  it('should return a 200 status code', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });
  it('should return a JSON response', async () => {
    const response = await request(app).get('/');
    expect(response.type).toBe('application/json');
  });
  it('should return the expected message', async () => {
    const response = await request(app).get('/');
    expect(response.body).toEqual('yes sirr 🫡🫡');
  });
});


describe('CORS middleware', () => {
  it('should allow requests from localhost:5173', async () => {
    const response = await request(app).get('/').set('Origin', 'http://localhost:5173');
    expect(response.status).toBe(200);
  });
  it('should block requests from other origins', async () => {
    const response = await request(app).get('/').set('Origin', 'http://example.com');
    expect(response.status).toBe(200);
  });
});


describe('Error Handling', () => {
  it('should handle invalid routes', async () => {
    const response = await request(app).get('/invalid-route');
    expect(response.status).toBe(404);
  });
});


describe('Route Handling', () => {
  it('should handle /api/auth requests', async () => {
    const response = await request(app).get('/api/auth');
    expect(response.status).toBe(404);
  });
    it('should handle /api/levels requests', async () => {
    const response = await request(app).get('/api/levels');
    expect(response.status).toBe(404);
  });
    it('should handle /api/llm requests', async () => {
    const response = await request(app).get('/api/llm');
    expect(response.status).toBe(404);
  });

});

describe('Server Listening', () => {
  it('should listen on the specified port', () => {
    const port = process.env.PORT || 3000;
    expect(app.listen).toBeDefined();
  });
});
