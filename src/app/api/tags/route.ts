import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin';
import { DEMO_TAGS } from '@/lib/demo-data';


export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json(DEMO_TAGS);
  const { data: tags, error } = await supabaseAdmin
    .from('tags')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(tags);
}