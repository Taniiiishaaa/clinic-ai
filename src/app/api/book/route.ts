import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      dob,
      phone,
      email,
      providerId,
      slotId,
      reason,
    } = body;

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({
        first_name: firstName,
        last_name: lastName,
        dob,
        phone,
        email,
      })
      .select()
      .single();

    if (patientError) throw patientError;

    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', slotId)
      .eq('is_booked', false)
      .single();

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot unavailable' }, { status: 400 });
    }

    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .insert({
        patient_id: patient.id,
        provider_id: providerId,
        slot_id: slotId,
        reason,
      })
      .select()
      .single();

    if (apptError) throw apptError;

    await supabase
      .from('availability_slots')
      .update({ is_booked: true })
      .eq('id', slotId);

    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Booking failed' }, { status: 500 });
  }
}