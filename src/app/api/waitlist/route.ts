import { NextRequest, NextResponse } from 'next/server';

// Simple but robust email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role, city, intake } = body;

    const emailTrimmed = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!emailTrimmed) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(emailTrimmed)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const cityValue = typeof city === 'string' && city.trim() ? city.trim() : '';
    const nameValue = typeof name === 'string' ? name.trim() || '' : '';
    const intakeValue = typeof intake === 'string' ? intake.trim() || '' : '';
    const roleValue = ['student', 'worker', 'visitor', 'other'].includes(role) ? role : 'other';

    const payload = {
      timestamp: new Date().toISOString(),
      email: emailTrimmed,
      name: nameValue || '',
      role: roleValue,
      city: cityValue || '',
      intake: intakeValue || '',
      country: 'India',
      source: 'waitlist_page',
    };

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('GOOGLE_SHEETS_WEBHOOK_URL is not set');
      return NextResponse.json(
        { error: 'Waitlist is not configured. Please try again later.' },
        { status: 500 },
      );
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Google Sheets webhook failed:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to save. Please try again or DM me on Instagram.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Waitlist API error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
