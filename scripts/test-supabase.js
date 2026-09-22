/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * ==============================================================================
 * SUPABASE CONNECTIVITY & SCHEMA VERIFICATION SCRIPT
 * ==============================================================================
 * Run with: node scripts/test-supabase.js
 * ==============================================================================
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local if present
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([A-Za-z0-9_]+)=(?:"(.*)"|'(.*)'|(.*))$/);
      if (match) {
        const key = match[1];
        const val = match[2] || match[3] || match[4] || '';
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n======================================================');
console.log('       AIRSMS STUDIO - SUPABASE CONNECTIVITY TEST     ');
console.log('======================================================');
console.log('Target Project URL:', url || '(missing)');
console.log('API Key configured:', key ? 'Yes (starts with ' + key.substring(0, 15) + '...)' : 'No');
console.log('------------------------------------------------------\n');

if (!url || !key) {
  console.error('❌ Error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function runAudit() {
  let passedChecks = 0;
  let totalChecks = 4;

  // 1. Check HTTP & Auth Service
  try {
    const authRes = await fetch(url + '/auth/v1/health', {
      headers: { 'apikey': key }
    });
    if (authRes.ok) {
      const authData = await authRes.json();
      console.log('✅ 1. Supabase Auth Service: HEALTHY (' + (authData.version || 'online') + ')');
      passedChecks++;
    } else {
      console.log('⚠️ 1. Supabase Auth Service HTTP Status:', authRes.status);
    }
  } catch (err) {
    console.log('❌ 1. Supabase Auth Service unreachable:', err.message);
  }

  // 2. Check students table
  try {
    const { data: students, error: studentsErr } = await supabase.from('students').select('*').limit(3);
    if (studentsErr) {
      if (studentsErr.code === 'PGRST205') {
        console.log('⏳ 2. Table `public.students`: Table does not exist in Postgres schema yet (PGRST205).');
      } else {
        console.log('⚠️ 2. Table `public.students`: Error:', studentsErr.message, studentsErr.code);
      }
    } else {
      console.log(`✅ 2. Table \`public.students\`: READY & ONLINE! (${students.length} rows verified)`);
      passedChecks++;
    }
  } catch (err) {
    console.log('❌ 2. Table `public.students` check failed:', err.message);
  }

  // 3. Check campaign_history table
  try {
    const { data: campaigns, error: campaignsErr } = await supabase.from('campaign_history').select('*').limit(3);
    if (campaignsErr) {
      if (campaignsErr.code === 'PGRST205') {
        console.log('⏳ 3. Table `public.campaign_history`: Table does not exist in Postgres schema yet (PGRST205).');
      } else {
        console.log('⚠️ 3. Table `public.campaign_history`: Error:', campaignsErr.message, campaignsErr.code);
      }
    } else {
      console.log(`✅ 3. Table \`public.campaign_history\`: READY & ONLINE! (${campaigns.length} rows verified)`);
      passedChecks++;
    }
  } catch (err) {
    console.log('❌ 3. Table `public.campaign_history` check failed:', err.message);
  }

  // 4. Check sms_templates table
  try {
    const { data: templates, error: templatesErr } = await supabase.from('sms_templates').select('*').limit(3);
    if (templatesErr) {
      if (templatesErr.code === 'PGRST205') {
        console.log('⏳ 4. Table `public.sms_templates`: Table does not exist in Postgres schema yet (PGRST205).');
      } else {
        console.log('⚠️ 4. Table `public.sms_templates`: Error:', templatesErr.message, templatesErr.code);
      }
    } else {
      console.log(`✅ 4. Table \`public.sms_templates\`: READY & ONLINE! (${templates.length} rows verified)`);
      passedChecks++;
    }
  } catch (err) {
    console.log('❌ 4. Table `public.sms_templates` check failed:', err.message);
  }

  console.log('\n======================================================');
  console.log(`SUMMARY: ${passedChecks}/${totalChecks} Checks Passed`);
  console.log('======================================================\n');

  if (passedChecks < totalChecks) {
    console.log('ℹ️  Action Needed:');
    console.log('To create the required tables in Supabase:');
    console.log('1. Open your Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/uqprjlfaindjftaeepqf/sql/new');
    console.log('2. Copy the contents of: supabase/schema.sql');
    console.log('3. Paste into the SQL Editor and click "RUN".');
    console.log('4. Re-run: node scripts/test-supabase.js');
  } else {
    console.log('🎉 All tables and connections are active and fully verified!');
  }
}

runAudit();
