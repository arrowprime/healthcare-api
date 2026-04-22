import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// ─── Swagger spec (defined inline — no build-time file scanning) ──────────────
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Healthcare Appointment API',
    version: '1.0.0',
    description:
      'Production-ready REST API for healthcare appointment scheduling. ' +
      'Features JWT authentication, role-based access control (patient / doctor / admin), ' +
      'conflict-safe scheduling, and full Swagger documentation.',
    contact: { name: 'Sheikh Waqas Kamran', url: 'https://github.com/arrowprime' },
  },
  servers: [{ url: '/api', description: 'API base' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          email:      { type: 'string', format: 'email' },
          full_name:  { type: 'string' },
          role:       { type: 'string', enum: ['patient', 'doctor', 'admin'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id:               { type: 'string', format: 'uuid' },
          patient_id:       { type: 'string', format: 'uuid' },
          doctor_id:        { type: 'string', format: 'uuid' },
          scheduled_at:     { type: 'string', format: 'date-time' },
          duration_minutes: { type: 'integer' },
          status:           { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
          notes:            { type: 'string' },
        },
      },
      Doctor: {
        type: 'object',
        properties: {
          id:             { type: 'string', format: 'uuid' },
          full_name:      { type: 'string' },
          email:          { type: 'string' },
          specialty:      { type: 'string' },
          bio:            { type: 'string' },
          available_from: { type: 'string', example: '09:00' },
          available_to:   { type: 'string', example: '17:00' },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'full_name'],
                properties: {
                  email:     { type: 'string', format: 'email' },
                  password:  { type: 'string', minLength: 8 },
                  full_name: { type: 'string' },
                  role:      { type: 'string', enum: ['patient', 'doctor', 'admin'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered, returns JWT' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive a JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful, returns JWT' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/appointments': {
      post: {
        tags: ['Appointments'],
        summary: 'Book a new appointment (patient only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['doctor_id', 'scheduled_at'],
                properties: {
                  doctor_id:        { type: 'string', format: 'uuid' },
                  scheduled_at:     { type: 'string', format: 'date-time' },
                  duration_minutes: { type: 'integer', minimum: 15, maximum: 120 },
                  notes:            { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Appointment created' },
          400: { description: 'Validation error' },
          403: { description: 'Only patients can book' },
          409: { description: 'Doctor unavailable at requested time' },
        },
      },
      get: {
        tags: ['Appointments'],
        summary: 'List appointments (scoped by role)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] } },
          { name: 'from',   in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to',     in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          200: { description: 'Array of appointments' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/appointments/{id}': {
      get: {
        tags: ['Appointments'],
        summary: 'Get appointment by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Appointment detail' }, 404: { description: 'Not found' } },
      },
      delete: {
        tags: ['Appointments'],
        summary: 'Delete / cancel appointment',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' }, 400: { description: 'Cannot cancel non-pending' }, 403: { description: 'Unauthorized' } },
      },
    },
    '/appointments/{id}/status': {
      patch: {
        tags: ['Appointments'],
        summary: 'Update appointment status (doctor / admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['confirmed', 'cancelled', 'completed'] } },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated appointment' }, 403: { description: 'Insufficient permissions' } },
      },
    },
    '/doctors': {
      get: {
        tags: ['Doctors'],
        summary: 'List all doctors (public)',
        responses: {
          200: { description: 'Array of doctors', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } } } } },
        },
      },
    },
    '/doctors/{id}': {
      get: {
        tags: ['Doctors'],
        summary: 'Get doctor by ID (public)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Doctor profile' }, 404: { description: 'Not found' } },
      },
    },
  },
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec as any));

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
