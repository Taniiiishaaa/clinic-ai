import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get('providerId');

  if (!providerId) {
    return NextResponse.json({ error: 'providerId required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_booked', false)
    .order('slot_time', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}