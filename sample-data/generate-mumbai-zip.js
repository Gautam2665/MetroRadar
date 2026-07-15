const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const targetDir = path.join(__dirname, 'mumbai');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const zip = new AdmZip();

const agency = `agency_id,agency_name,agency_url,agency_timezone
MMMOCL,Maha Mumbai Metro Operation Corporation Limited,https://mmmocl.co.in,Asia/Kolkata
`;

const stops = `stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station
ST_DAHE,Dahisar East Station,19.2506,72.8624,1,
DAHE_P1,Dahisar East - Platform 1,19.2506,72.8624,0,ST_DAHE
ST_KNDP,Kandarpada Station,19.2435,72.8552,1,
KNDP_P1,Kandarpada - Platform 1,19.2435,72.8552,0,ST_KNDP
`;

const routes = `route_id,agency_id,route_short_name,route_long_name,route_type,route_color
L2A,MMMOCL,Line 2A,Yellow Line,1,FFFF00
`;

const trips = `route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
L2A,WEEKDAY,T_L2A_01,Dahisar East,0,
`;

const stop_times = `trip_id,arrival_time,departure_time,stop_id,stop_sequence
T_L2A_01,06:00:00,06:00:30,ST_DAHE,1
T_L2A_01,06:03:00,06:03:30,ST_KNDP,2
`;

const calendar = `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
WEEKDAY,1,1,1,1,1,0,0,20260101,20261231
`;

zip.addFile('agency.txt', Buffer.from(agency, 'utf8'));
zip.addFile('stops.txt', Buffer.from(stops, 'utf8'));
zip.addFile('routes.txt', Buffer.from(routes, 'utf8'));
zip.addFile('trips.txt', Buffer.from(trips, 'utf8'));
zip.addFile('stop_times.txt', Buffer.from(stop_times, 'utf8'));
zip.addFile('calendar.txt', Buffer.from(calendar, 'utf8'));

zip.writeZip(path.join(targetDir, 'mumbai-metro-gtfs.zip'));
console.log('Successfully generated mumbai-metro-gtfs.zip!');
