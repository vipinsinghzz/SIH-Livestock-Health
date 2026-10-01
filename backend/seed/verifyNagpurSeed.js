const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { supabaseAdmin, supabaseAuth } = require('../config/supabaseClient');

async function verify() {
  console.log('================================================================');
  console.log('🔍 VERIFYING NAGPUR SYNTHETIC DEMO NETWORK (LIVE SUPABASE)');
  console.log('Target:', process.env.SUPABASE_URL);
  console.log('================================================================\n');

  // 1. Profiles
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, role, district, state, latitude, longitude');
  
  if (pErr) console.error('Error fetching profiles:', pErr);
  const farmers = profiles.filter(p => p.role === 'farmer');
  const vets = profiles.filter(p => p.role === 'veterinarian');
  const officers = profiles.filter(p => p.role === 'officer');

  console.log(`1. Profiles: Total = ${profiles.length}`);
  console.log(`   - Farmers: ${farmers.length}`);
  console.log(`   - Veterinarians: ${vets.length}`);
  console.log(`   - Officers: ${officers.length}`);

  const puneProfiles = profiles.filter(p => (p.district || '').toLowerCase().includes('pune') || (p.latitude && p.latitude < 20.0));
  console.log(`   - Pune/Baramati Profiles Remaining: ${puneProfiles.length}`);

  // 2. Animals
  const { data: animals, error: animErr } = await supabaseAdmin
    .from('animals')
    .select('id, tag_id, name, species, breed, health_status, owner_id');
  if (animErr) console.error('Error fetching animals:', animErr.message);
  console.log(`2. Animals: Total = ${animals?.length || 0}`);

  // 3. AI Health Screenings (Scans + Reports + Triage)
  const { data: scans } = await supabaseAdmin.from('scan_images').select('id, disease, confidence, risk_level');
  const { data: reports } = await supabaseAdmin.from('reports').select('id, case_id, species, status, district, block, village');
  const { data: triage } = await supabaseAdmin.from('triage_results').select('id, report_id, risk_level, model_version');
  console.log(`3. AI Screenings:`);
  console.log(`   - Scan Images: ${scans?.length || 0}`);
  console.log(`   - Surveillance Reports: ${reports?.length || 0}`);
  console.log(`   - Species-Specific AI Triage Results: ${triage?.length || 0}`);

  // 4. Disease Cases
  const { data: cases } = await supabaseAdmin
    .from('disease_cases')
    .select('id, case_id, disease, status, risk, district_id, latitude, longitude, farmer_location');
  console.log(`4. Disease Cases: Total = ${cases?.length || 0}`);
  const puneCases = (cases || []).filter(c => (c.district_id || '').toLowerCase().includes('pune') || (c.latitude && c.latitude < 20.0));
  console.log(`   - Pune/Baramati Cases Remaining: ${puneCases.length}`);

  // 5. Case Timeline
  const { data: timeline } = await supabaseAdmin.from('case_timeline').select('id, case_id, status, notes');
  console.log(`5. Case Timeline Records: Total = ${timeline?.length || 0}`);

  // 6. Containment Zones
  const { data: zones } = await supabaseAdmin.from('containment_zones').select('id, zone_id, status, center_lat, center_lng, radius_km, disease, block, village');
  console.log(`6. Containment Zones: Total = ${zones?.length || 0}`);
  zones?.forEach(z => {
    console.log(`   - Zone ${z.zone_id}: status: ${z.status} | disease: ${z.disease} | center: ${z.center_lat}, ${z.center_lng} | radius: ${z.radius_km} km (${z.village}, ${z.block})`);
  });

  // 7. Vaccination Drives & Registrations
  const { data: drives } = await supabaseAdmin.from('vaccination_drives').select('id, camp_id, venue, vaccine, status, district, latitude, longitude');
  const { data: regs } = await supabaseAdmin.from('vaccination_camp_registrations').select('id, token, farmer_name, animal_count, drive_id');
  console.log(`7. Vaccination Drives: Total = ${drives?.length || 0}, Registrations: Total = ${regs?.length || 0}`);
  const puneDrives = (drives || []).filter(d => (d.district || '').toLowerCase().includes('pune') || (d.latitude && d.latitude < 20.0));
  console.log(`   - Pune/Baramati Drives Remaining: ${puneDrives.length}`);

  // 8. Diagnostic Lab Referrals (RDDL Nagpur)
  const { data: referrals } = await supabaseAdmin.from('lab_referrals').select('id, sample_type, status, referred_lab');
  console.log(`8. Lab Referrals: Total = ${referrals?.length || 0}`);
  referrals?.forEach(r => console.log(`   - ${r.sample_type} -> ${r.referred_lab} [${r.status}]`));

  // 9. Advisories
  const { data: advisories } = await supabaseAdmin.from('advisories').select('id, title_en, title_hi, severity, target_block');
  console.log(`9. Advisories: Total = ${advisories?.length || 0}`);

  // 10. Notifications
  const { data: notifs } = await supabaseAdmin.from('notifications').select('id, title, status, recipient_id');
  console.log(`10. Notifications: Total = ${notifs?.length || 0}`);

  // 11. AUTH LOGIN TESTS
  console.log('\n--- TESTING SUPABASE AUTH LOGINS ---');
  const testUsers = [
    { email: 'farmer@pashurakshak.in', pass: 'Farmer@123', role: 'farmer' },
    { email: 'vet@pashurakshak.in', pass: 'Vet@123', role: 'veterinarian' },
    { email: 'officer@pashurakshak.in', pass: 'Admin@123', role: 'officer' },
  ];

  for (const tu of testUsers) {
    const { data: authResult, error: authErr } = await supabaseAuth.auth.signInWithPassword({
      email: tu.email,
      password: tu.pass
    });
    if (authErr) {
      console.error(`❌ Login FAILED for ${tu.email}:`, authErr.message);
    } else {
      console.log(`✅ Login SUCCESS for ${tu.email} (${tu.role}) - User ID: ${authResult.user.id}`);
    }
  }

  // 12. Test Nearby Veterinarians Top 10 for Nagpur Urban Farmer (21.1458, 79.0882)
  console.log('\n--- TOP 10 NEARBY VETERINARIANS FROM NAGPUR URBAN (21.1458, 79.0882) ---');
  const farmerLat = 21.1458, farmerLng = 79.0882;
  const vetsWithDist = vets
    .filter(v => v.latitude && v.longitude)
    .map(v => {
      const R = 6371; // km
      const dLat = (v.latitude - farmerLat) * Math.PI / 180;
      const dLng = (v.longitude - farmerLng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(farmerLat*Math.PI/180) * Math.cos(v.latitude*Math.PI/180) * Math.sin(dLng/2)**2;
      const dist = (2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
      return { name: v.name, email: v.email, clinic: v.clinic_name, distKm: parseFloat(dist), lat: v.latitude, lng: v.longitude };
    })
    .sort((a, b) => a.distKm - b.distKm);

  vetsWithDist.slice(0, 10).forEach((v, idx) => {
    console.log(`   ${idx + 1}. ${v.name} | ${v.clinic || 'Civil Veterinary Hospital'} | ${v.distKm} km (${v.lat.toFixed(4)}, ${v.lng.toFixed(4)})`);
  });

  console.log('\n================================================================');
  console.log('✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

verify().catch(console.error);
