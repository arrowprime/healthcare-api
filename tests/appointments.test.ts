import request from 'supertest';
import app from '../src/app';
import { signToken } from '../src/services/auth.service';

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { end: jest.fn() },
}));

import { query } from '../src/db';
const mockQuery = jest.mocked(query);

const patientToken = signToken({ userId: 'patient-1', role: 'patient', email: 'patient@test.com' });
const doctorToken  = signToken({ userId: 'doctor-1',  role: 'doctor',  email: 'doctor@test.com'  });
const adminToken   = signToken({ userId: 'admin-1',   role: 'admin',   email: 'admin@test.com'   });

beforeEach(() => jest.clearAllMocks());

// ─── GET /api/appointments ────────────────────────────────────────────────────

describe('GET /api/appointments', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
  });

  it('returns appointment list for a patient', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'a1', patient_id: 'patient-1', doctor_id: 'doctor-1', status: 'pending', patient_name: 'P', doctor_name: 'D' }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns all appointments for admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── POST /api/appointments ───────────────────────────────────────────────────

describe('POST /api/appointments', () => {
  it('returns 403 when a doctor tries to book', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ doctor_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', scheduled_at: '2025-09-01T10:00:00.000Z' });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid UUID doctor_id', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor_id: 'not-a-uuid', scheduled_at: '2025-09-01T10:00:00.000Z' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('creates appointment for a patient', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)   // no conflict
      .mockResolvedValueOnce({
        rows: [{ id: 'appt-new', patient_id: 'patient-1', doctor_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', status: 'pending', duration_minutes: 30 }],
        rowCount: 1,
      } as any);

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctor_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        scheduled_at: '2025-09-01T10:00:00.000Z',
        duration_minutes: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
  });

  it('returns 409 when doctor has a conflict', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'conflict' }], rowCount: 1 } as any);

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctor_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        scheduled_at: '2025-09-01T10:00:00.000Z',
      });

    expect(res.status).toBe(409);
  });
});

// ─── PATCH /api/appointments/:id/status ──────────────────────────────────────

describe('PATCH /api/appointments/:id/status', () => {
  it('returns 403 when patient tries to update status', async () => {
    const res = await request(app)
      .patch('/api/appointments/appt-1/status')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(403);
  });

  it('allows doctor to confirm their own appointment', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'appt-1', patient_id: 'patient-1', doctor_id: 'doctor-1', status: 'pending', patient_name: 'P', doctor_name: 'D', patient_email: 'p@t.com', doctor_email: 'd@t.com' }],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'appt-1', status: 'confirmed' }], rowCount: 1 } as any);

    const res = await request(app)
      .patch('/api/appointments/appt-1/status')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch('/api/appointments/appt-1/status')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: 'unknown' });

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/doctors ─────────────────────────────────────────────────────────

describe('GET /api/doctors', () => {
  it('lists doctors without authentication', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'doc-1', full_name: 'Dr Smith', specialty: 'Cardiology' }],
      rowCount: 1,
    } as any);

    const res = await request(app).get('/api/doctors');
    expect(res.status).toBe(200);
    expect(res.body[0].specialty).toBe('Cardiology');
  });

  it('returns 404 for unknown doctor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const res = await request(app).get('/api/doctors/nonexistent-id');
    expect(res.status).toBe(404);
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
