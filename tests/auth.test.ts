import request from 'supertest';
import app from '../src/app';

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { end: jest.fn() },
}));

import { query } from '../src/db';
const mockQuery = jest.mocked(query);

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a new user and returns a JWT', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)           // no duplicate
      .mockResolvedValueOnce({                                             // insert
        rows: [{ id: 'uid-1', email: 'waqas@test.com', full_name: 'Waqas', role: 'patient', created_at: new Date() }],
        rowCount: 1,
      } as any);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'waqas@test.com', password: 'SecurePass1', full_name: 'Waqas' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('waqas@test.com');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-valid', password: 'SecurePass1', full_name: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 for short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ok@test.com', password: '123', full_name: 'Test' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 } as any);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'taken@test.com', password: 'SecurePass1', full_name: 'Test' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer garbage.token.here');

    expect(res.status).toBe(401);
  });

  it('returns user for valid token', async () => {
    const { signToken } = await import('../src/services/auth.service');
    const token = signToken({ userId: 'uid-1', role: 'patient', email: 'w@test.com' });

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'uid-1', email: 'w@test.com', full_name: 'Waqas', role: 'patient', created_at: new Date() }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('w@test.com');
  });
});
