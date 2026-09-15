import { NextResponse } from 'next/server';

// Deprecated - Twilio voice webhooks removed. App uses Personal SIM Calling via Android SIM Gateway.
export async function POST() {
  return NextResponse.json(
    { error: 'Twilio integration removed. System uses Personal SIM Calling Architecture via Android SIM Gateway.' },
    { status: 410 }
  );
}

export async function GET() {
  return POST();
}
