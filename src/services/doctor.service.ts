import { query } from '../db';

export const getDoctors = async () => {
  const result = await query(
    `SELECT u.id, u.full_name, u.email, d.specialty, d.bio, d.available_from, d.available_to
     FROM users u
     JOIN doctors d ON u.id = d.user_id
     WHERE u.role = 'doctor'
     ORDER BY u.full_name`
  );
  return result.rows;
};

export const getDoctorById = async (id: string) => {
  const result = await query(
    `SELECT u.id, u.full_name, u.email, d.specialty, d.bio, d.available_from, d.available_to
     FROM users u
     JOIN doctors d ON u.id = d.user_id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};
