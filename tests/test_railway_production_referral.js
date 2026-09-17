const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const { supabase, createSupabaseToken } = require('../backend/config/supabaseClient');
const RAILWAY_URL = 'https://sih-livestock-health-production.up.railway.app';

async function testRailwayProduction() {
  console.log('📡 Testing Railway Production:', RAILWAY_URL);

  // 1. Health check
  const healthRes = await fetch(`${RAILWAY_URL}/health`);
  console.log('Health check status:', healthRes.status, await healthRes.json());

  // 2. Resolve farmer token
  const farmerData = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Ramesh Patil (रमेश पाटील)',
    email: 'farmer@pashurakshak.in',
    role: 'farmer',
    district: 'Nagpur'
  };
  const token = createSupabaseToken(farmerData);

  // 3. Check what happens on Railway POST /api/cases
  const referralPayload = {
    animalName: 'Lakshmi',
    species: 'Cattle',
    disease: 'Babesiosis / Tick-Borne Disease',
    confidence: 95,
    risk: 'High',
    district: 'Nagpur',
    symptoms: ['Fever', 'Lethargy']
  };

  const res = await fetch(`${RAILWAY_URL}/api/cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(referralPayload)
  });

  const body = await res.json().catch(() => null);
  console.log('Railway POST /api/cases status:', res.status);
  console.log('Railway POST /api/cases body:', body);
}

testRailwayProduction().catch(console.error);
