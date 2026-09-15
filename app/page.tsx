import { redirect } from 'next/navigation';
import { getTeacherSession } from '@/lib/auth/session';

export default async function HomePage() {
  const session = await getTeacherSession();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
