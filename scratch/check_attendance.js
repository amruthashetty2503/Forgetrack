const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env from frontend/.env.local
const envFile = fs.readFileSync('frontend/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
        env[parts[0].trim()] = parts[1].trim();
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data: students, error: sErr } = await supabase.from('students').select('id, name, usn').order('name').limit(20);
    if (sErr) { console.error(sErr); return; }
    
    const { data: sessions, error: sessErr } = await supabase.from('sessions').select('id, date');
    console.log(`Total sessions in DB: ${sessions?.length}`);

    for (const s of students) {
        const { count, error: aErr } = await supabase.from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', s.id)
            .eq('present', true);
        
        const { count: totalAtt } = await supabase.from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', s.id);

        console.log(`${s.name} (${s.usn}): Attended=${count}, TotalRecords=${totalAtt}`);
    }
}
check();
