import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StationDef {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface LineDef {
  id: string;
  code: string;
  name: string;
  color: string;
  stations: StationDef[];
}

interface MetroDef {
  code: string;
  city: string;
  name: string;
  agencyName: string;
  website: string;
  lines: LineDef[];
}

const METROS: MetroDef[] = [
  {
    code: 'HMRL',
    city: 'Hyderabad',
    name: 'Hyderabad Metro Rail',
    agencyName: 'Hyderabad Metro Rail Limited',
    website: 'https://hmrl.co.in',
    lines: [
      {
        id: 'HMRL_RED',
        code: 'RED',
        name: 'Red Line',
        color: 'E53E3E',
        stations: [
          { id: 'HYD_R01', name: 'Miyapur', lat: 17.4967, lon: 78.3614 },
          { id: 'HYD_R02', name: 'JNTU College', lat: 17.4975, lon: 78.3905 },
          { id: 'HYD_R03', name: 'KPHB Colony', lat: 17.4842, lon: 78.4011 },
          { id: 'HYD_R04', name: 'Kukatpally', lat: 17.4729, lon: 78.4116 },
          { id: 'HYD_R05', name: 'Balanagar', lat: 17.4647, lon: 78.4239 },
          { id: 'HYD_R06', name: 'Moosapet', lat: 17.4583, lon: 78.4312 },
          { id: 'HYD_R07', name: 'Bharat Nagar', lat: 17.4504, lon: 78.4385 },
          { id: 'HYD_R08', name: 'Erragadda', lat: 17.4437, lon: 78.4446 },
          { id: 'HYD_R09', name: 'ESI Hospital', lat: 17.4398, lon: 78.4485 },
          { id: 'HYD_R10', name: 'SR Nagar', lat: 17.4383, lon: 78.4526 },
          { id: 'HYD_R11', name: 'Ameerpet', lat: 17.4348, lon: 78.4584 },
          { id: 'HYD_R12', name: 'Punjagutta', lat: 17.4258, lon: 78.4542 },
          { id: 'HYD_R13', name: 'Irrum Manzil', lat: 17.4194, lon: 78.4567 },
          { id: 'HYD_R14', name: 'Khairatabad', lat: 17.4118, lon: 78.4619 },
          { id: 'HYD_R15', name: 'Lakdikapul', lat: 17.4042, lon: 78.4651 },
          { id: 'HYD_R16', name: 'Assembly', lat: 17.3976, lon: 78.4712 },
          { id: 'HYD_R17', name: 'Nampally', lat: 17.3912, lon: 78.4695 },
          { id: 'HYD_R18', name: 'Gandhi Bhavan', lat: 17.3855, lon: 78.4741 },
          { id: 'HYD_R19', name: 'Osmania Medical College', lat: 17.3812, lon: 78.4815 },
          { id: 'HYD_R20', name: 'MG Bus Station', lat: 17.3785, lon: 78.4852 },
          { id: 'HYD_R21', name: 'Malakpet', lat: 17.3725, lon: 78.4942 },
          { id: 'HYD_R22', name: 'Dilsukhnagar', lat: 17.3688, lon: 78.5247 },
          { id: 'HYD_R23', name: 'LB Nagar', lat: 17.3501, lon: 78.5528 },
        ],
      },
      {
        id: 'HMRL_BLUE',
        code: 'BLUE',
        name: 'Blue Line',
        color: '3182CE',
        stations: [
          { id: 'HYD_B01', name: 'Raidurg', lat: 17.4418, lon: 78.3802 },
          { id: 'HYD_B02', name: 'Hitec City', lat: 17.4468, lon: 78.3772 },
          { id: 'HYD_B03', name: 'Durgam Cheruvu', lat: 17.4431, lon: 78.3892 },
          { id: 'HYD_B04', name: 'Madhapur', lat: 17.4402, lon: 78.3976 },
          { id: 'HYD_B05', name: 'Jubilee Hills Check Post', lat: 17.4312, lon: 78.4112 },
          { id: 'HYD_B06', name: 'Yusufguda', lat: 17.4365, lon: 78.4318 },
          { id: 'HYD_R11', name: 'Ameerpet', lat: 17.4348, lon: 78.4584 },
          { id: 'HYD_B07', name: 'Begumpet', lat: 17.4376, lon: 78.4682 },
          { id: 'HYD_B08', name: 'Paradise', lat: 17.4412, lon: 78.4891 },
          { id: 'HYD_B09', name: 'Secunderabad East', lat: 17.4338, lon: 78.5021 },
          { id: 'HYD_B10', name: 'Tarnaka', lat: 17.4285, lon: 78.5298 },
          { id: 'HYD_B11', name: 'Nagole', lat: 17.3782, lon: 78.5668 },
        ],
      },
    ],
  },
  {
    code: 'BMRCL',
    city: 'Bengaluru',
    name: 'Namma Metro',
    agencyName: 'Bengaluru Metro Rail Corporation Limited',
    website: 'https://bmrcl.co.in',
    lines: [
      {
        id: 'BMRCL_PURPLE',
        code: 'PURPLE',
        name: 'Purple Line',
        color: '805AD5',
        stations: [
          { id: 'BLR_P01', name: 'Challaghatta', lat: 12.9095, lon: 77.4641 },
          { id: 'BLR_P02', name: 'Kengeri', lat: 12.9112, lon: 77.4785 },
          { id: 'BLR_P03', name: 'Mysore Road', lat: 12.9465, lon: 77.5312 },
          { id: 'BLR_P04', name: 'Vijayanagar', lat: 12.9698, lon: 77.5368 },
          { id: 'BLR_P05', name: 'Majestic', lat: 12.9779, lon: 77.5729 },
          { id: 'BLR_P06', name: 'Vidhana Soudha', lat: 12.9798, lon: 77.5925 },
          { id: 'BLR_P07', name: 'MG Road', lat: 12.9756, lon: 77.6068 },
          { id: 'BLR_P08', name: 'Indiranagar', lat: 12.9784, lon: 77.6385 },
          { id: 'BLR_P09', name: 'Baiyappanahalli', lat: 12.9908, lon: 77.6524 },
          { id: 'BLR_P10', name: 'KR Puram', lat: 13.0012, lon: 77.6782 },
          { id: 'BLR_P11', name: 'Whitefield', lat: 12.9698, lon: 77.7499 },
        ],
      },
      {
        id: 'BMRCL_GREEN',
        code: 'GREEN',
        name: 'Green Line',
        color: '38A169',
        stations: [
          { id: 'BLR_G01', name: 'Nagasandra', lat: 13.0478, lon: 77.5002 },
          { id: 'BLR_G02', name: 'Yeshwantpur', lat: 13.0235, lon: 77.5498 },
          { id: 'BLR_G03', name: 'Rajajinagar', lat: 13.0002, lon: 77.5562 },
          { id: 'BLR_P05', name: 'Majestic', lat: 12.9779, lon: 77.5729 },
          { id: 'BLR_G04', name: 'National College', lat: 12.9501, lon: 77.5742 },
          { id: 'BLR_G05', name: 'Jayanagar', lat: 12.9298, lon: 77.5801 },
          { id: 'BLR_G06', name: 'Banashankari', lat: 12.9154, lon: 77.5738 },
          { id: 'BLR_G07', name: 'Silk Institute', lat: 12.8612, lon: 77.5448 },
        ],
      },
    ],
  },
  {
    code: 'CMRL',
    city: 'Chennai',
    name: 'Chennai Metro',
    agencyName: 'Chennai Metro Rail Limited',
    website: 'https://chennaimetrorail.org',
    lines: [
      {
        id: 'CMRL_BLUE',
        code: 'BLUE',
        name: 'Blue Line',
        color: '3182CE',
        stations: [
          { id: 'MAA_B01', name: 'Wimco Nagar', lat: 13.1702, lon: 80.3012 },
          { id: 'MAA_B02', name: 'Washermanpet', lat: 13.1118, lon: 80.2815 },
          { id: 'MAA_B03', name: 'Chennai Central', lat: 13.0827, lon: 80.2757 },
          { id: 'MAA_B04', name: 'LIC', lat: 13.0641, lon: 80.2642 },
          { id: 'MAA_B05', name: 'Teynampet', lat: 13.0412, lon: 80.2478 },
          { id: 'MAA_B06', name: 'Guindy', lat: 13.0092, lon: 80.2131 },
          { id: 'MAA_B07', name: 'Alandur', lat: 13.0041, lon: 80.2015 },
          { id: 'MAA_B08', name: 'Chennai Airport', lat: 12.9814, lon: 80.1638 },
        ],
      },
      {
        id: 'CMRL_GREEN',
        code: 'GREEN',
        name: 'Green Line',
        color: '38A169',
        stations: [
          { id: 'MAA_B03', name: 'Chennai Central', lat: 13.0827, lon: 80.2757 },
          { id: 'MAA_G01', name: 'Egmore', lat: 13.0784, lon: 80.2612 },
          { id: 'MAA_G02', name: 'Kilpauk', lat: 13.0788, lon: 80.2415 },
          { id: 'MAA_G03', name: 'Koyambedu', lat: 13.0732, lon: 80.1942 },
          { id: 'MAA_G04', name: 'Vadapalani', lat: 13.0512, lon: 80.2114 },
          { id: 'MAA_B07', name: 'Alandur', lat: 13.0041, lon: 80.2015 },
          { id: 'MAA_G05', name: 'St. Thomas Mount', lat: 12.9954, lon: 80.1982 },
        ],
      },
    ],
  },
  {
    code: 'GMRC',
    city: 'Ahmedabad',
    name: 'Ahmedabad Metro',
    agencyName: 'Gujarat Metro Rail Corporation',
    website: 'https://gujaratmetrorail.com',
    lines: [
      {
        id: 'GMRC_NS',
        code: 'RED',
        name: 'North-South Line',
        color: 'E53E3E',
        stations: [
          { id: 'AMD_NS01', name: 'APMC', lat: 22.9892, lon: 72.5348 },
          { id: 'AMD_NS02', name: 'Paldi', lat: 23.0135, lon: 72.5642 },
          { id: 'AMD_NS03', name: 'Old High Court', lat: 23.0368, lon: 72.5678 },
          { id: 'AMD_NS04', name: 'Usmanpura', lat: 23.0478, lon: 72.5691 },
          { id: 'AMD_NS05', name: 'Sabarmati', lat: 23.0812, lon: 72.5834 },
          { id: 'AMD_NS06', name: 'Motera Stadium', lat: 23.0915, lon: 72.5976 },
        ],
      },
      {
        id: 'GMRC_EW',
        code: 'BLUE',
        name: 'East-West Line',
        color: '3182CE',
        stations: [
          { id: 'AMD_EW01', name: 'Thaltej', lat: 23.0489, lon: 72.5112 },
          { id: 'AMD_EW02', name: 'Gurukul Road', lat: 23.0498, lon: 72.5324 },
          { id: 'AMD_NS03', name: 'Old High Court', lat: 23.0368, lon: 72.5678 },
          { id: 'AMD_EW03', name: 'Kalupur Railway Station', lat: 23.0285, lon: 72.5992 },
          { id: 'AMD_EW04', name: 'Vastral Gam', lat: 23.0034, lon: 72.6589 },
        ],
      },
    ],
  },
];

function generateGtfsZip(metro: MetroDef): Buffer {
  const zip = new AdmZip();

  // agency.txt
  const agencyTxt = `agency_id,agency_name,agency_url,agency_timezone,agency_lang\n${metro.code},"${metro.agencyName}",${metro.website},Asia/Kolkata,en\n`;
  zip.addFile('agency.txt', Buffer.from(agencyTxt, 'utf8'));

  // stops.txt
  const allStopsMap = new Map<string, StationDef>();
  metro.lines.forEach((l) => l.stations.forEach((s) => allStopsMap.set(s.id, s)));

  let stopsTxt = `stop_id,stop_name,stop_lat,stop_lon,location_type\n`;
  allStopsMap.forEach((s) => {
    stopsTxt += `${s.id},"${s.name}",${s.lat},${s.lon},0\n`;
  });
  zip.addFile('stops.txt', Buffer.from(stopsTxt, 'utf8'));

  // routes.txt
  let routesTxt = `route_id,agency_id,route_short_name,route_long_name,route_type,route_color,route_text_color\n`;
  metro.lines.forEach((l) => {
    routesTxt += `${l.id},${metro.code},"${l.code}","${l.name}",1,${l.color},FFFFFF\n`;
  });
  zip.addFile('routes.txt', Buffer.from(routesTxt, 'utf8'));

  // calendar.txt
  const calendarTxt = `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nFULLWEEK,1,1,1,1,1,1,1,20260101,20261231\n`;
  zip.addFile('calendar.txt', Buffer.from(calendarTxt, 'utf8'));

  // trips.txt & stop_times.txt
  let tripsTxt = `route_id,service_id,trip_id,trip_headsign,direction_id,shape_id\n`;
  let stopTimesTxt = `trip_id,arrival_time,departure_time,stop_id,stop_sequence\n`;
  let shapesTxt = `shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\n`;

  let tripCounter = 1;
  metro.lines.forEach((line) => {
    const shapeId = `SHAPE_${line.id}`;
    line.stations.forEach((s, idx) => {
      shapesTxt += `${shapeId},${s.lat},${s.lon},${idx + 1}\n`;
    });

    // Create trips throughout the day
    for (let hour = 6; hour <= 22; hour += 2) {
      const tripId = `TRIP_${line.id}_${hour}`;
      const lastStationName = line.stations[line.stations.length - 1].name;
      tripsTxt += `${line.id},FULLWEEK,${tripId},"${lastStationName}",0,${shapeId}\n`;

      line.stations.forEach((stn, seqIdx) => {
        const arrTime = `${String(hour).padStart(2, '0')}:${String(seqIdx * 3).padStart(2, '0')}:00`;
        const depTime = `${String(hour).padStart(2, '0')}:${String(seqIdx * 3 + 1).padStart(2, '0')}:00`;
        stopTimesTxt += `${tripId},${arrTime},${depTime},${stn.id},${seqIdx + 1}\n`;
      });
      tripCounter++;
    }
  });

  zip.addFile('trips.txt', Buffer.from(tripsTxt, 'utf8'));
  zip.addFile('stop_times.txt', Buffer.from(stopTimesTxt, 'utf8'));
  zip.addFile('shapes.txt', Buffer.from(shapesTxt, 'utf8'));

  return zip.toBuffer();
}

async function main() {
  console.log(`\n======================================================`);
  console.log(` 🚇 National GTFS Seed & Importer Script`);
  console.log(`    Seeding & Ingesting Hyderabad, Bengaluru, Chennai, Ahmedabad`);
  console.log(`======================================================\n`);

  for (const metro of METROS) {
    console.log(`------------------------------------------------------`);
    console.log(`📌 Seeding System: ${metro.code} (${metro.city})`);

    const folderName = metro.city.toLowerCase().split(' ')[0];
    const rawDir = path.join(process.cwd(), 'datasets', folderName, 'raw');
    if (!fs.existsSync(rawDir)) {
      fs.mkdirSync(rawDir, { recursive: true });
    }

    const zipBuffer = generateGtfsZip(metro);
    const zipPath = path.join(rawDir, 'gtfs-static.zip');
    fs.writeFileSync(zipPath, zipBuffer);
    console.log(`   ✅ Created GTFS ZIP: ${zipPath}`);

    // Create System record in PostgreSQL database if not existing
    const existingSystem = await prisma.system.findUnique({
      where: { code: metro.code },
    });

    if (!existingSystem) {
      await prisma.system.create({
        data: {
          code: metro.code,
          name: metro.name,
          city: metro.city,
          country: 'India',
          timezone: 'Asia/Kolkata',
          website: metro.website,
          sourceType: metro.code === 'HMRL' ? 'OFFICIAL' : 'COMMUNITY',
          trustTier: metro.code === 'HMRL' ? 'TIER_A' : 'TIER_B',
          qualityScore: 90.0,
          badgeTier: metro.code === 'HMRL' ? 'Gold' : 'Silver',
        },
      });
      console.log(`   ✅ Created PostgreSQL System record for ${metro.code}`);
    } else {
      console.log(`   ℹ️ System record already exists for ${metro.code}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(` ✅ National GTFS Datasets Created & Seeded!`);
  console.log(`======================================================\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
