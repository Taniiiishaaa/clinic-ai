import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, provider, time } = body;

    if (!email || !name || !provider || !time) {
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'Clinic AI <onboarding@resend.dev>',
      to: email,
      subject: 'Appointment Confirmation',
      html: `
        <h2>Appointment Confirmed</h2>
        <p>Hello ${name},</p>
        <p>Your appointment is booked.</p>
        <p><b>Doctor:</b> ${provider}</p>
        <p><b>Time:</b> ${time}</p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: error.message || 'Email send failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('send-email route error:', error);
    return NextResponse.json({ error: 'Email failed' }, { status: 500 });
  }
}