import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'telugu-ai-attendance-caller-default-secret-key';

export interface TeacherJwtPayload {
  teacherId: string;
  email: string;
  name: string;
  collegeName: string;
}

export function signToken(payload: TeacherJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TeacherJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TeacherJwtPayload;
  } catch (error) {
    return null;
  }
}
