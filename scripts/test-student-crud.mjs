import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uqprjlfaindjftaeepqf.supabase.co";
const SUPABASE_KEY = "sb_publishable_cEj9W2JskGN2cAyNfTy3IA_jdyBOl0a";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeIraqPhoneNumber(input) {
  if (!input) return { isValid: false, normalized: '' };
  const digits = String(input).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[^0-9]/g, '');
  let normalized = '';
  if (digits.startsWith('009647') && digits.length === 15) normalized = digits.substring(2);
  else if (digits.startsWith('9647') && digits.length === 13) normalized = digits;
  else if (digits.startsWith('07') && digits.length === 11) normalized = '964' + digits.substring(1);
  else if (digits.startsWith('7') && digits.length === 10) normalized = '964' + digits;
  const isValid = /^9647[0-9]{9}$/.test(normalized);
  return { isValid, normalized };
}

async function runTests() {
  console.log('=== 1. Phone Normalization Test ===');
  const testCases = [
    { input: '0750 123 4567', expected: '9647501234567' },
    { input: '+9647702345678', expected: '9647702345678' },
    { input: '7803456789', expected: '9647803456789' },
    { input: '009647504567890', expected: '9647504567890' }
  ];

  for (const tc of testCases) {
    const res = normalizeIraqPhoneNumber(tc.input);
    if (res.isValid && res.normalized === tc.expected) {
      console.log(`  ✓ PASSED: "${tc.input}" -> "${res.normalized}"`);
    } else {
      console.error(`  ✗ FAILED: "${tc.input}" expected "${tc.expected}", got "${res.normalized}"`);
      process.exit(1);
    }
  }

  console.log('\n=== 2. Supabase students Table Query ===');
  const { data: initialStudents, error: fetchErr } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchErr) {
    console.error('  ✗ Supabase fetch error:', fetchErr.message);
    process.exit(1);
  }
  console.log(`  ✓ Successfully queried students table. Total rows: ${initialStudents.length}`);
  if (initialStudents.length > 0) {
    console.log(`  ✓ Sample row: ID=${initialStudents[0].student_id}, Name=${initialStudents[0].full_name}, Phone=${initialStudents[0].phone_number}`);
  }

  console.log('\n=== 3. CRUD: Create Test Student ===');
  const testStudentId = `TEST-${Date.now()}`;
  const { data: created, error: createErr } = await supabase
    .from('students')
    .insert([
      {
        student_id: testStudentId,
        full_name: 'CRUD Verification Student',
        department: 'Information Technology',
        stage: 'Stage 2',
        phone_number: '9647509998877'
      }
    ])
    .select()
    .single();

  if (createErr) {
    console.error('  ✗ Supabase insert error:', createErr.message);
    process.exit(1);
  }
  console.log(`  ✓ Created student record with UUID: ${created.id} (ID: ${created.student_id})`);

  console.log('\n=== 4. CRUD: Update Test Student ===');
  const { data: updated, error: updateErr } = await supabase
    .from('students')
    .update({ stage: 'Stage 3', full_name: 'CRUD Verification Student (Updated)' })
    .eq('id', created.id)
    .select()
    .single();

  if (updateErr) {
    console.error('  ✗ Supabase update error:', updateErr.message);
    process.exit(1);
  }
  console.log(`  ✓ Updated student stage to: ${updated.stage}`);

  console.log('\n=== 5. CRUD: Delete Test Student ===');
  const { error: deleteErr } = await supabase
    .from('students')
    .delete()
    .eq('id', created.id);

  if (deleteErr) {
    console.error('  ✗ Supabase delete error:', deleteErr.message);
    process.exit(1);
  }
  console.log(`  ✓ Cleanly deleted test student record.`);

  console.log('\n========================================');
  console.log(' ALL 5/5 VERIFICATION CHECKS PASSED! ');
  console.log('========================================');
}

runTests();
