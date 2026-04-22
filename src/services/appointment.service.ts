import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';

export const createAppointment = async (
  patientId: string,
  doctorId: string,
  scheduledAt: Date,
  durationMinutes = 30,
  notes = ''
) => {
  // Conflict check — no overlapping slots for the same doctor
  const conflict = await query(
    `SELECT id FROM appointments
     WHERE doctor_id = $1
       AND status NOT IN ('cancelled')
       AND scheduled_at < $2::timestamptz + ($3 || ' minutes')::interval
       AND scheduled_at + (duration_minutes || ' minutes')::interval > $2::timestamptz`,
    [doctorId, scheduledAt, durationMinutes]
  );

  if (conflict.rows.length > 0) {
    throw new Error('Doctor is not available at the requested time');
  }

  const result = await query(
    `INSERT INTO appointments (id, patient_id, doctor_id, scheduled_at, duration_minutes, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [uuidv4(), patientId, doctorId, scheduledAt, durationMinutes, notes]
  );
  return result.rows[0];
};

export const getAppointments = async (
  userId: string,
  role: string,
  filters: { status?: string; from?: string; to?: string } = {}
) => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (role === 'patient') {
    conditions.push(`a.patient_id = $${idx++}`);
    params.push(userId);
  } else if (role === 'doctor') {
    conditions.push(`a.doctor_id = $${idx++}`);
    params.push(userId);
  }

  if (filters.status) { conditions.push(`a.status = $${idx++}`); params.push(filters.status); }
  if (filters.from)   { conditions.push(`a.scheduled_at >= $${idx++}`); params.push(filters.from); }
  if (filters.to)     { conditions.push(`a.scheduled_at <= $${idx++}`); params.push(filters.to); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT a.*,
            p.full_name AS patient_name,
            d.full_name AS doctor_name
     FROM appointments a
     JOIN users p ON a.patient_id = p.id
     JOIN users d ON a.doctor_id  = d.id
     ${where}
     ORDER BY a.scheduled_at DESC`,
    params
  );
  return result.rows;
};

export const getAppointmentById = async (id: string) => {
  const result = await query(
    `SELECT a.*,
            p.full_name AS patient_name, p.email AS patient_email,
            d.full_name AS doctor_name,  d.email AS doctor_email
     FROM appointments a
     JOIN users p ON a.patient_id = p.id
     JOIN users d ON a.doctor_id  = d.id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const updateAppointmentStatus = async (
  id: string,
  status: 'confirmed' | 'cancelled' | 'completed',
  requesterId: string,
  requesterRole: string
) => {
  const appt = await getAppointmentById(id);
  if (!appt) throw new Error('Appointment not found');
  if (requesterRole === 'doctor' && appt.doctor_id !== requesterId) throw new Error('Not authorized');

  const result = await query(
    'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
};

export const deleteAppointment = async (
  id: string,
  requesterId: string,
  requesterRole: string
) => {
  const appt = await getAppointmentById(id);
  if (!appt) throw new Error('Appointment not found');
  if (requesterRole === 'patient') {
    if (appt.patient_id !== requesterId) throw new Error('Not authorized');
    if (appt.status !== 'pending') throw new Error('Only pending appointments can be cancelled');
  }
  await query('DELETE FROM appointments WHERE id = $1', [id]);
  return true;
};
