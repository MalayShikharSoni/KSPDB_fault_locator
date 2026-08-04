import { db } from '../db';
import { substations, feeders, dts, poles } from '../db/schema';
import crypto from 'crypto';

// Haversine distance
function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

function moveAlongBearing(lat: number, lon: number, bearingDeg: number, distanceMeters: number) {
    const R = 6371e3;
    const brng = bearingDeg * Math.PI/180;
    const phi1 = lat * Math.PI/180;
    const lambda1 = lon * Math.PI/180;
    const d = distanceMeters;

    const phi2 = Math.asin( Math.sin(phi1)*Math.cos(d/R) +
                        Math.cos(phi1)*Math.sin(d/R)*Math.cos(brng) );
    const lambda2 = lambda1 + Math.atan2(Math.sin(brng)*Math.sin(d/R)*Math.cos(phi1),
                             Math.cos(d/R)-Math.sin(phi1)*Math.sin(d/R));

    return { lat: phi2 * 180/Math.PI, lon: lambda2 * 180/Math.PI };
}

const BANGALORE_LAT = 12.9716;
const BANGALORE_LON = 77.5946;

async function runSeed() {
  console.log('Starting seed...');

  // Clean DB
  await db.delete(poles);
  await db.delete(dts);
  await db.delete(feeders);
  await db.delete(substations);

  // 1 Substation
  const subId = 'SUB-01';
  await db.insert(substations).values({ id: subId, name: 'Bangalore Central 66/11kV' });

  // 3 Feeders
  const feederIds = ['F-01', 'F-02', 'F-03'];
  for (let i = 0; i < feederIds.length; i++) {
    await db.insert(feeders).values({
      id: feederIds[i],
      substationId: subId,
      name: `Feeder ${i + 1}`,
    });
  }

  // 12 DTs
  const numDTs = 12;
  const numPolesPerDT = 100;
  
  // Exactly 40% (5 DTs) surveyed, 60% (7 DTs) inferred
  let surveyedDTs = 5; 
  let inferredDTs = 7;

  let allPoles: any[] = [];
  let poleCounter = 1;

  for (let d = 0; d < numDTs; d++) {
    const isSurveyed = surveyedDTs > 0 ? true : false;
    if (isSurveyed) surveyedDTs--;
    else inferredDTs--;

    const dtId = `D-${(d + 1).toString().padStart(4, '0')}`;
    const feederId = feederIds[d % feederIds.length];
    
    // Spread DTs around Bangalore center
    const dtAngle = (d / numDTs) * 360;
    const dtPos = moveAlongBearing(BANGALORE_LAT, BANGALORE_LON, dtAngle, 2000 + Math.random() * 3000); // 2-5km away
    
    await db.insert(dts).values({
      id: dtId,
      feederId,
      lat: dtPos.lat,
      lon: dtPos.lon,
      capacityKva: 250,
      householdsServed: Math.floor(Math.random() * 200) + 100,
    });

    // Generate Poles for this DT (Branching Radial)
    let polesForDT: any[] = [];
    
    const numMain = 60;
    const numBranch1 = 20;
    const numBranch2 = 20;

    const mainAngle = Math.random() * 360;
    
    let currentLat = dtPos.lat;
    let currentLon = dtPos.lon;
    let lastPoleId = null;

    let seq = 1;
    // Main line
    for (let p = 0; p < numMain; p++) {
      const poleId = `P-${poleCounter.toString().padStart(6, '0')}`;
      poleCounter++;
      
      const pos = moveAlongBearing(currentLat, currentLon, mainAngle + (Math.random()*10 - 5), 30 + Math.random() * 20); // 30-50m
      currentLat = pos.lat;
      currentLon = pos.lon;

      polesForDT.push({
        id: poleId,
        dtId,
        feederId,
        lat: currentLat,
        lon: currentLon,
        seqOnLine: isSurveyed ? seq++ : null,
        parentPoleId: isSurveyed ? lastPoleId : null,
        poleType: 'LT-9m-PCC',
        ward: 'W-01',
        pincode: '560001',
        deviceId: `KSPDB-DEV-${poleId}`,
      });
      lastPoleId = poleId;
    }

    // Branch 1
    const branch1StartIdx = 20;
    let b1Lat = polesForDT[branch1StartIdx].lat;
    let b1Lon = polesForDT[branch1StartIdx].lon;
    let b1LastPoleId = polesForDT[branch1StartIdx].id;
    const branch1Angle = mainAngle + 45 + (Math.random()*20); // branch off 45 deg
    for (let p = 0; p < numBranch1; p++) {
      const poleId = `P-${poleCounter.toString().padStart(6, '0')}`;
      poleCounter++;
      const pos = moveAlongBearing(b1Lat, b1Lon, branch1Angle + (Math.random()*10 - 5), 30 + Math.random() * 20);
      b1Lat = pos.lat;
      b1Lon = pos.lon;

      polesForDT.push({
        id: poleId,
        dtId,
        feederId,
        lat: b1Lat,
        lon: b1Lon,
        seqOnLine: isSurveyed ? seq++ : null,
        parentPoleId: isSurveyed ? b1LastPoleId : null,
        poleType: 'LT-8m-Steel',
        ward: 'W-01',
        pincode: '560001',
        deviceId: `KSPDB-DEV-${poleId}`,
      });
      b1LastPoleId = poleId;
    }

    // Branch 2
    const branch2StartIdx = 40;
    let b2Lat = polesForDT[branch2StartIdx].lat;
    let b2Lon = polesForDT[branch2StartIdx].lon;
    let b2LastPoleId = polesForDT[branch2StartIdx].id;
    const branch2Angle = mainAngle - 45 - (Math.random()*20); // branch off -45 deg
    for (let p = 0; p < numBranch2; p++) {
      const poleId = `P-${poleCounter.toString().padStart(6, '0')}`;
      poleCounter++;
      const pos = moveAlongBearing(b2Lat, b2Lon, branch2Angle + (Math.random()*10 - 5), 30 + Math.random() * 20);
      b2Lat = pos.lat;
      b2Lon = pos.lon;

      polesForDT.push({
        id: poleId,
        dtId,
        feederId,
        lat: b2Lat,
        lon: b2Lon,
        seqOnLine: isSurveyed ? seq++ : null,
        parentPoleId: isSurveyed ? b2LastPoleId : null,
        poleType: 'LT-8m-Steel',
        ward: 'W-01',
        pincode: '560001',
        deviceId: `KSPDB-DEV-${poleId}`,
      });
      b2LastPoleId = poleId;
    }

    allPoles.push(...polesForDT);
  }

  // Apply missing data constraints globally
  // 9% missing devices
  const numMissingDevices = Math.floor(allPoles.length * 0.09);
  let indices = Array.from({length: allPoles.length}, (_, i) => i);
  indices.sort(() => Math.random() - 0.5);
  for (let i = 0; i < numMissingDevices; i++) {
    allPoles[indices[i]].deviceId = null;
  }

  // 3% missing pincodes
  indices.sort(() => Math.random() - 0.5);
  const numMissingPincodes = Math.floor(allPoles.length * 0.03);
  for (let i = 0; i < numMissingPincodes; i++) {
    allPoles[indices[i]].pincode = null;
  }

  // Insert in batches of 100
  for (let i = 0; i < allPoles.length; i += 100) {
    await db.insert(poles).values(allPoles.slice(i, i + 100));
  }

  console.log(`Seeded 1 Substation, 3 Feeders, 12 DTs, and ${allPoles.length} Poles.`);
  process.exit(0);
}

runSeed().catch(err => {
  console.error(err);
  process.exit(1);
});
