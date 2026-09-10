/**
 * Maharashtra 36-District Veterinary Database Seeder
 * File: backend/seed/seedMaharashtraVets.js
 * 
 * Seeds approximately 60 high-quality, geographically distributed DUMMY
 * veterinarian records FOR EACH of the 36 districts of Maharashtra (~2,160 total).
 * Uses the EXISTING User model (role: 'veterinarian').
 * All records are strictly tagged with isDummy: true and dataSource: 'DEMO'.
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pashurakshak';

// 36 Districts of Maharashtra with accurate centroid coordinates & verified talukas
const MAHARASHTRA_DISTRICTS = [
  {
    name: 'Ahmednagar',
    lat: 19.0952,
    lng: 74.7496,
    talukas: ['Nagar', 'Rahuri', 'Sangamner', 'Shrirampur', 'Newasa', 'Shevgaon', 'Parner', 'Kopargaon', 'Akole', 'Pathardi', 'Jamkhed', 'Karjat', 'Shrigonda', 'Rahata']
  },
  {
    name: 'Akola',
    lat: 20.7002,
    lng: 77.0082,
    talukas: ['Akola', 'Balapur', 'Patur', 'Barshitakli', 'Murtizapur', 'Telhara', 'Akot']
  },
  {
    name: 'Amravati',
    lat: 20.9320,
    lng: 77.7523,
    talukas: ['Amravati', 'Bhatkuli', 'Nandgaon Khandeshwar', 'Dharni', 'Chikhaldara', 'Achalpur', 'Chandurbazar', 'Morshi', 'Warud', 'Daryapur', 'Anjangaon Surji', 'Chandur Railway', 'Dhamangaon Railway', 'Teosa']
  },
  {
    name: 'Chhatrapati Sambhajinagar',
    altNames: ['Aurangabad'],
    lat: 19.8762,
    lng: 75.3433,
    talukas: ['Chhatrapati Sambhajinagar', 'Kannad', 'Soegaon', 'Sillod', 'Phulambri', 'Khuldabad', 'Vaijapur', 'Gangapur', 'Paithan']
  },
  {
    name: 'Beed',
    lat: 18.9891,
    lng: 75.7601,
    talukas: ['Beed', 'Ashti', 'Patoda', 'Shirur Kasar', 'Georai', 'Majalgaon', 'Wadwani', 'Kaij', 'Dharur', 'Parli', 'Ambajogai']
  },
  {
    name: 'Bhandara',
    lat: 21.1667,
    lng: 79.6500,
    talukas: ['Bhandara', 'Tumsar', 'Pauni', 'Mohadi', 'Sakoli', 'Lakhani', 'Lakhandur']
  },
  {
    name: 'Buldhana',
    lat: 20.5292,
    lng: 76.1843,
    talukas: ['Buldhana', 'Chikhli', 'Deulgaon Raja', 'Jalgaon Jamod', 'Sangrampur', 'Malkapur', 'Motala', 'Nandura', 'Khamgaon', 'Shegaon', 'Mehkar', 'Sindkhed Raja', 'Lonar']
  },
  {
    name: 'Chandrapur',
    lat: 19.9615,
    lng: 79.2961,
    talukas: ['Chandrapur', 'Bhadravati', 'Warora', 'Chimur', 'Nagbhir', 'Bramhapuri', 'Sindewahi', 'Mul', 'Saoli', 'Pombhurna', 'Ballarpur', 'Korpana', 'Rajura', 'Gondpipri', 'Jivati']
  },
  {
    name: 'Dhule',
    lat: 20.9042,
    lng: 74.7749,
    talukas: ['Dhule', 'Sakri', 'Sindkheda', 'Shirpur']
  },
  {
    name: 'Gadchiroli',
    lat: 20.1809,
    lng: 80.0018,
    talukas: ['Gadchiroli', 'Dhanora', 'Chamorshi', 'Armori', 'Kurkheda', 'Korchi', 'Desaiganj Wadsa', 'Aheri', 'Etapalli', 'Bhamragad', 'Sironcha', 'Mulchera']
  },
  {
    name: 'Gondia',
    lat: 21.4598,
    lng: 80.1961,
    talukas: ['Gondia', 'Tirora', 'Goregaon', 'Arjuni Morgaon', 'Amgaon', 'Salekasa', 'Sadak Arjuni', 'Deori']
  },
  {
    name: 'Hingoli',
    lat: 19.7173,
    lng: 77.1471,
    talukas: ['Hingoli', 'Sengaon', 'Kalamnuri', 'Basmath', 'Aundha Nagnath']
  },
  {
    name: 'Jalgaon',
    lat: 21.0077,
    lng: 75.5626,
    talukas: ['Jalgaon', 'Jamner', 'Erandol', 'Dharangaon', 'Bhusawal', 'Raver', 'Muktainagar', 'Bodwad', 'Yawal', 'Amalner', 'Parola', 'Chopda', 'Pachora', 'Bhadgaon', 'Chalisgaon']
  },
  {
    name: 'Jalna',
    lat: 19.8347,
    lng: 75.8816,
    talukas: ['Jalna', 'Bhokardan', 'Jafrabad', 'Badnapur', 'Ambad', 'Ghansawangi', 'Partur', 'Mantha']
  },
  {
    name: 'Kolhapur',
    lat: 16.7050,
    lng: 74.2433,
    talukas: ['Karveer', 'Panhala', 'Shahuwadi', 'Kagal', 'Hatkanangle', 'Shirol', 'Radhanagari', 'Gaganbawda', 'Bhudargad', 'Ajra', 'Gadhinglaj', 'Chandgad']
  },
  {
    name: 'Latur',
    lat: 18.4088,
    lng: 76.5604,
    talukas: ['Latur', 'Ausa', 'Renapur', 'Ahmedpur', 'Jalkot', 'Chakur', 'Shirur Anantpal', 'Nilanga', 'Deoni', 'Udgir']
  },
  {
    name: 'Mumbai City',
    lat: 18.9388,
    lng: 72.8354,
    talukas: ['Colaba', 'Fort', 'Dadar', 'Byculla', 'Parel', 'Worli', 'Mahim']
  },
  {
    name: 'Mumbai Suburban',
    lat: 19.0760,
    lng: 72.8777,
    talukas: ['Kurla', 'Andheri', 'Borivali', 'Bandra', 'Goregaon', 'Malad', 'Ghatkopar', 'Mulund']
  },
  {
    name: 'Nagpur',
    lat: 21.1458,
    lng: 79.0882,
    talukas: ['Nagpur Urban', 'Nagpur Rural', 'Kamptee', 'Hingna', 'Katol', 'Narkhed', 'Savner', 'Kalameshwar', 'Ramtek', 'Mouda', 'Parseoni', 'Umred', 'Kuhi', 'Bhivapur']
  },
  {
    name: 'Nanded',
    lat: 19.1383,
    lng: 77.3210,
    talukas: ['Nanded', 'Ardhapur', 'Mudkhed', 'Bhokar', 'Umri', 'Loha', 'Kandhar', 'Kinwat', 'Himayatnagar', 'Hadgaon', 'Mahur', 'Deglur', 'Mukhed', 'Dharmabad', 'Biloli', 'Naigaon']
  },
  {
    name: 'Nandurbar',
    lat: 21.3734,
    lng: 74.2404,
    talukas: ['Nandurbar', 'Navapur', 'Shahada', 'Taloda', 'Akkalkuwa', 'Akrani Dhadgaon']
  },
  {
    name: 'Nashik',
    lat: 19.9975,
    lng: 73.7898,
    talukas: ['Nashik', 'Sinnar', 'Dindori', 'Igatpuri', 'Trimbakeshwar', 'Niphad', 'Yeola', 'Chandwad', 'Nandgaon', 'Satana', 'Malegaon', 'Deola', 'Kalwan', 'Surgana', 'Peint']
  },
  {
    name: 'Dharashiv',
    altNames: ['Osmanabad'],
    lat: 18.1861,
    lng: 76.0419,
    talukas: ['Dharashiv', 'Tuljapur', 'Omerga', 'Lohara', 'Kallam', 'Paranda', 'Bhoom', 'Washi']
  },
  {
    name: 'Palghar',
    lat: 19.6967,
    lng: 72.7699,
    talukas: ['Palghar', 'Vada', 'Vikramgad', 'Jawhar', 'Mokhada', 'Dahanu', 'Talasari', 'Vasai']
  },
  {
    name: 'Parbhani',
    lat: 19.2612,
    lng: 76.7767,
    talukas: ['Parbhani', 'Gangakhed', 'Sonpeth', 'Pathri', 'Manwath', 'Palam', 'Selu', 'Jintur', 'Purna']
  },
  {
    name: 'Pune',
    lat: 18.5204,
    lng: 73.8567,
    talukas: ['Pune City', 'Haveli', 'Baramati', 'Shirur', 'Junnar', 'Ambegaon', 'Khed', 'Maval', 'Mulshi', 'Velhe', 'Bhor', 'Purandar', 'Daund', 'Indapur']
  },
  {
    name: 'Raigad',
    lat: 18.5158,
    lng: 73.1822,
    talukas: ['Alibag', 'Pen', 'Panvel', 'Karjat', 'Khalapur', 'Roha', 'Sudhagad', 'Mangaon', 'Tala', 'Mahad', 'Poladpur', 'Shrivardhan', 'Mhasla', 'Murud', 'Uran']
  },
  {
    name: 'Ratnagiri',
    lat: 16.9902,
    lng: 73.3120,
    talukas: ['Ratnagiri', 'Chiplun', 'Dapoli', 'Khed', 'Guhagar', 'Sangameshwar', 'Lanja', 'Rajapur', 'Mandangad']
  },
  {
    name: 'Sangli',
    lat: 16.8524,
    lng: 74.5815,
    talukas: ['Miraj', 'Tasgaon', 'Kavathe Mahankal', 'Walwa', 'Shirala', 'Khanapur', 'Atpadi', 'Jat', 'Kadegaon', 'Palus']
  },
  {
    name: 'Satara',
    lat: 17.6805,
    lng: 73.9920,
    talukas: ['Satara', 'Wai', 'Khandala', 'Koregaon', 'Phaltan', 'Man', 'Khatav', 'Karad', 'Patan', 'Jaoli', 'Mahabaleshwar']
  },
  {
    name: 'Sindhudurg',
    lat: 16.1158,
    lng: 73.6871,
    talukas: ['Kudal', 'Sawantwadi', 'Malvan', 'Vengurla', 'Kankavli', 'Devgad', 'Vaibhavwadi', 'Dodamarg']
  },
  {
    name: 'Solapur',
    lat: 17.6599,
    lng: 75.9064,
    talukas: ['Solapur North', 'Solapur South', 'Barshi', 'Akkalkot', 'Mohol', 'Pandharpur', 'Malshiras', 'Sangola', 'Mangalwedha', 'Karmala', 'Madha']
  },
  {
    name: 'Thane',
    lat: 19.2183,
    lng: 72.9781,
    talukas: ['Thane', 'Kalyan', 'Murbad', 'Bhiwandi', 'Shahapur', 'Ulhasnagar', 'Ambarnath']
  },
  {
    name: 'Wardha',
    lat: 20.7453,
    lng: 78.6022,
    talukas: ['Wardha', 'Deoli', 'Seloo', 'Arvi', 'Ashti', 'Karanja', 'Hinganghat', 'Samudrapur']
  },
  {
    name: 'Washim',
    lat: 20.1118,
    lng: 77.1352,
    talukas: ['Washim', 'Malegaon', 'Risod', 'Mangrulpir', 'Karanja Lad', 'Manora']
  },
  {
    name: 'Yavatmal',
    lat: 20.3888,
    lng: 78.1204,
    talukas: ['Yavatmal', 'Arni', 'Babhulgaon', 'Kalamb', 'Darwha', 'Digras', 'Ner', 'Pusad', 'Umarkhed', 'Mahagaon', 'Wani', 'Maregaon', 'Zari Jamani', 'Kelapur Pandharkawada', 'Ralegaon', 'Ghatanji']
  }
];

// Realistic names for veterinarians in Maharashtra
const FIRST_NAMES = [
  'Ananya', 'Rohan', 'Sneha', 'Ganesh', 'Pooja', 'Vikram', 'Priyanka', 'Suresh',
  'Kavita', 'Amol', 'Deepali', 'Sachin', 'Meena', 'Nitin', 'Sunita', 'Mahesh',
  'Shubhangi', 'Prashant', 'Archana', 'Rahul', 'Jyoti', 'Santosh', 'Manish',
  'Swati', 'Rajendra', 'Vaishali', 'Dattatray', 'Pallavi', 'Vijay', 'Anita',
  'Ajay', 'Shilpa', 'Balasaheb', 'Ashwini', 'Kiran', 'Sujata', 'Manoj', 'Neeta'
];

const LAST_NAMES = [
  'Deshmukh', 'Patil', 'Jadhav', 'Pawar', 'Kulkarni', 'Shinde', 'Gaikwad',
  'Chavan', 'Bhosale', 'More', 'Kadam', 'Sawant', 'Mane', 'Kamble', 'Thorat',
  'Salunkhe', 'Sonawane', 'Gore', 'Wagh', 'Dhumal', 'Kale', 'Jagdhane',
  'Shirke', 'Surve', 'Mohite', 'Pardeshi', 'Bhave', 'Chaudhari', 'Suryawanshi',
  'Rathod', 'Ghuge', 'Shelke', 'Tambe', 'Gawande', 'Patekar', 'Borse'
];

const DEGREES = ['B.V.Sc & A.H.', 'M.V.Sc (Medicine)', 'M.V.Sc (Surgery)', 'M.V.Sc (Gynaecology)', 'B.V.Sc'];

const SPECIALIZATIONS = [
  'General Veterinary Physician',
  'Livestock Medicine & Infectious Diseases',
  'Animal Reproduction & Artificial Insemination',
  'Large Animal Surgery & Trauma',
  'Dairy Herd Health & Mastitis Control',
  'Epidemiology & Outbreak Surveillance',
  'Veterinary Parasitology & Preventive Care',
  'Emergency & Critical Care'
];

const CLINIC_TYPES = [
  'Government Taluka Veterinary Dispensary',
  'Zilla Parishad Veterinary Polyclinic',
  'Block Animal Health Care Center',
  'Kisan Pashu Seva Kendra',
  'Rural Veterinary Aid Center',
  'Mobile Veterinary Outreach Unit'
];

const VILLAGE_SUFFIXES = [
  'Gram Panchayat Office Road', 'Main Bazaar', 'Near APMC Mandi', 'Milk Cooperative Society',
  'Station Road', 'Old Bus Stand', 'Kisan Seva Kendra', 'Gaothan', 'Near Vet Hospital'
];

async function seedMaharashtraVets() {
  console.log('🚀 Starting Maharashtra 36-District Veterinarian Seeding...');
  console.log(`Connecting to: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB connected successfully.');

  // Delete existing dummy/demo vets only (never touch real/operational users)
  const deleteResult = await User.deleteMany({
    $or: [{ isDummy: true }, { dataSource: 'DEMO' }]
  });
  console.log(`🧹 Removed ${deleteResult.deletedCount} prior dummy veterinarian records.`);

  // Pre-hash password once for ultra-fast bulk insertion
  const defaultPasswordHash = await bcrypt.hash('DemoVet@123', 10);

  const vetsToInsert = [];
  let globalCount = 0;

  for (const dist of MAHARASHTRA_DISTRICTS) {
    // 60 dummy vets per district (within 50-75 requested range)
    const countForDistrict = 60;
    const talukas = dist.talukas;

    for (let i = 0; i < countForDistrict; i++) {
      globalCount++;
      const firstName = FIRST_NAMES[(i + globalCount) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(i * 3 + globalCount) % LAST_NAMES.length];
      const degree = DEGREES[i % DEGREES.length];
      const name = `Dr. ${firstName} ${lastName} (${degree})`;

      const taluka = talukas[i % talukas.length];
      const villageSuffix = VILLAGE_SUFFIXES[i % VILLAGE_SUFFIXES.length];
      const village = `${taluka} ${villageSuffix}`;
      const area = `${taluka}, ${dist.name}`;
      const clinicName = `${taluka} ${CLINIC_TYPES[i % CLINIC_TYPES.length]}`;

      // Geographic distribution: distribute across realistic sub-regions of the district
      // Use spiral/polar distribution around district centroid (radius 3km to 45km)
      const angle = (i * 137.5) * (Math.PI / 180); // Golden ratio angle for uniform 2D distribution
      const radiusDeg = 0.03 + (0.28 * (i / countForDistrict)); // ~3km to ~35km spread
      const latOffset = radiusDeg * Math.cos(angle);
      const lngOffset = radiusDeg * Math.sin(angle);

      const lat = Number((dist.lat + latOffset).toFixed(6));
      const lng = Number((dist.lng + lngOffset).toFixed(6));

      // 90% AVAILABLE / ACTIVE, 10% ON_CALL to test status filters
      const availability = i % 10 === 0 ? 'ON_CALL' : (i % 7 === 0 ? 'ACTIVE' : 'AVAILABLE');
      const isAvailable = true;
      const isActive = true;

      // Dummy phone formatted realistically (+91 98xxx xxxxx)
      const phoneSuffix = String(100000 + (globalCount * 37) % 900000);
      const phonePrefix = ['9822', '9823', '9765', '9890', '9422', '9657'][i % 6];
      const phone = `+91 ${phonePrefix} ${phoneSuffix.slice(0, 5)}`;

      // Distinct email
      const safeDistName = dist.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `demo.vet.${safeDistName}.${i + 1}@pashurakshak.in`;

      const specialization = SPECIALIZATIONS[i % SPECIALIZATIONS.length];
      const rating = Number((4.6 + ((i % 5) * 0.1)).toFixed(1));
      const experience = 4 + ((i * 2) % 15);

      vetsToInsert.push({
        name,
        role: 'veterinarian',
        isActive,
        phone,
        email,
        passwordHash: defaultPasswordHash,
        district: dist.name,
        block: taluka,
        village,
        area,
        clinicName,
        state: 'Maharashtra',
        location: { lat, lng },
        registrationNo: `MVC/${2018 + (i % 6)}/DEMO-${dist.name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        department: i % 3 === 0 ? 'Private Veterinary Polyclinic' : 'Department of Animal Husbandry, Maharashtra',
        specialization,
        availability,
        isAvailable,
        isDummy: true,
        dataSource: 'DEMO',
        rating,
        experience,
        emergencyAvailable: true,
        services: [
          'Clinical Triage',
          'Emergency Treatment',
          'Vaccination',
          'Artificial Insemination',
          'Deworming & Nutrition'
        ]
      });
    }
  }

  console.log(`📦 Prepared ${vetsToInsert.length} demo veterinarian records across all ${MAHARASHTRA_DISTRICTS.length} districts.`);
  console.log('💾 Inserting into MongoDB User collection...');

  const inserted = await User.insertMany(vetsToInsert, { ordered: false });
  console.log(`🎉 SUCCESS! Successfully seeded ${inserted.length} dummy veterinarians.`);

  // Verify distribution per district
  const districtCounts = await User.aggregate([
    { $match: { isDummy: true, dataSource: 'DEMO' } },
    { $group: { _id: '$district', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  console.log('\n📊 Seeding Summary by District:');
  districtCounts.forEach(d => {
    console.log(`  - ${d._id}: ${d.count} vets`);
  });

  const totalVets = await User.countDocuments({ role: 'veterinarian' });
  const demoVets = await User.countDocuments({ role: 'veterinarian', isDummy: true });
  console.log(`\n✅ Total Veterinarians in DB: ${totalVets} (Demo records: ${demoVets})`);

  await mongoose.disconnect();
  console.log('🔒 Disconnected from MongoDB.');
}

if (require.main === module) {
  seedMaharashtraVets()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error during seeding:', err);
      process.exit(1);
    });
}

module.exports = { seedMaharashtraVets, MAHARASHTRA_DISTRICTS };
