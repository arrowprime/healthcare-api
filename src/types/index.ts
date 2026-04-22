export type Role = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  full_name: string;
  created_at: Date;
}

export interface Doctor {
  id: string;
  user_id: string;
  specialty: string;
  bio: string;
  available_from: string;
  available_to: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: Date;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string;
  created_at: Date;
}

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}
