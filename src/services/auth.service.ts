import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { JwtPayload, Role } from '../types';

const JWT_SECRET = () => process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = '7d';

export const registerUser = async (
  email: string,
  password: string,
  fullName: string,
  role: Role = 'patient'
) => {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  const result = await query(
    `INSERT INTO users (id, email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, full_name, role, created_at`,
    [id, email, passwordHash, fullName, role]
  );

  const user = result.rows[0];
  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  return { user, token };
};

export const loginUser = async (email: string, password: string) => {
  const result = await query(
    'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  const { password_hash: _ph, ...safeUser } = user;
  return { user: safeUser, token };
};

export const getUserById = async (id: string) => {
  const result = await query(
    'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
};

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_SECRET(), { expiresIn: JWT_EXPIRES_IN });

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET()) as JwtPayload;
