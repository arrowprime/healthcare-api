import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as appointmentService from '../services/appointment.service';

const createSchema = z.object({
  doctor_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().min(15).max(120).optional(),
  notes: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed']),
});

export const create = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createSchema.parse(req.body);
    const appointment = await appointmentService.createAppointment(
      req.user!.userId,
      data.doctor_id,
      new Date(data.scheduled_at),
      data.duration_minutes,
      data.notes
    );
    res.status(201).json(appointment);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    if (err instanceof Error && err.message.includes('not available')) {
      res.status(409).json({ error: err.message });
      return;
    }
    next(err);
  }
};

export const list = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, from, to } = req.query as Record<string, string>;
    const appointments = await appointmentService.getAppointments(
      req.user!.userId,
      req.user!.role,
      { status, from, to }
    );
    res.json(appointments);
  } catch (err) {
    next(err);
  }
};

export const getById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appointment = await appointmentService.getAppointmentById(req.params.id);
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    res.json(appointment);
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = statusSchema.parse(req.body);
    const appointment = await appointmentService.updateAppointmentStatus(
      req.params.id,
      status,
      req.user!.userId,
      req.user!.role
    );
    res.json(appointment);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    if (err instanceof Error) {
      if (err.message === 'Appointment not found') { res.status(404).json({ error: err.message }); return; }
      if (err.message === 'Not authorized')        { res.status(403).json({ error: err.message }); return; }
    }
    next(err);
  }
};

export const remove = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await appointmentService.deleteAppointment(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Appointment not found')           { res.status(404).json({ error: err.message }); return; }
      if (err.message === 'Not authorized')                  { res.status(403).json({ error: err.message }); return; }
      if (err.message.includes('Only pending'))              { res.status(400).json({ error: err.message }); return; }
    }
    next(err);
  }
};
