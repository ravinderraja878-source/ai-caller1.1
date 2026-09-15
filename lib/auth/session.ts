import { cookies } from 'next/headers';
import { verifyToken, TeacherJwtPayload } from './jwt';

export const COOKIE_NAME = 'telugu_caller_token';

export async function getTeacherSession(): Promise<TeacherJwtPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function requireTeacherSession(): Promise<TeacherJwtPayload> {
  const session = await getTeacherSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
