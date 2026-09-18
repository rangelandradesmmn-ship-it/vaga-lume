const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
let url = '';
let key = '';

env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

async function resetData() {
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  console.log('Fetching GUARDIANS...');
  const resProfiles = await fetch(url + '/rest/v1/profiles?role=eq.GUARDIAN&select=id', { headers });
  const guardians = await resProfiles.json();
  
  console.log(`Found ${guardians.length} guardians to delete.`);
  for (const g of guardians) {
    await fetch(url + '/auth/v1/admin/users/' + g.id, { method: 'DELETE', headers });
    console.log('Deleted user:', g.id);
  }

  console.log('Deleting all guardians links...');
  await fetch(url + '/rest/v1/guardians', { method: 'DELETE', headers });

  console.log('Deleting all children...');
  await fetch(url + '/rest/v1/children', { method: 'DELETE', headers });
  
  console.log('Deleting health records...');
  await fetch(url + '/rest/v1/health_records', { method: 'DELETE', headers });
  
  console.log('Deleting routine records...');
  await fetch(url + '/rest/v1/sleep_records', { method: 'DELETE', headers });
  await fetch(url + '/rest/v1/meals', { method: 'DELETE', headers });
  await fetch(url + '/rest/v1/bath_records', { method: 'DELETE', headers });

  console.log('Reset complete!');
}

resetData();
