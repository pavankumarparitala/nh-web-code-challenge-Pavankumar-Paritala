import { useState } from 'react';
import './App.css';

const clinicians = [
  { name: 'Barb', address: '4120 Garfield Ave, Minneapolis, MN 55409' },
  { name: 'Isaac', address: '140 104th Ln NW, Blaine MN 55448' },
  { name: 'Marisol', address: '2393 Kalmia Ave, Boulder, CO 80304' },
  { name: 'Mary', address: '608 Spruce Dr, Hudson, WI 54016' },
  { name: 'Shawna', address: '1727 W Highland Pkwy, St Paul, MN 55116' },
  { name: 'Shelly', address: '1232 3rd St, Hudson, WI 54016' },
  { name: 'Tom', address: '14173 Flagstone Trail, Apple Valley MN 55124' },
];

const labs = [
  { name: 'Edina Lab', address: '6525 France Ave, Edina, MN, 55435' },
  { name: 'Medical Arts Lab', address: '835 Nicollet Mall, Minneapolis, MN 55402' },
  { name: 'Bloomington Lab', address: '2716 E 82nd St, Bloomington, MN 55425' },
  { name: 'Hudson Lab', address: '400 2nd St S, Hudson, WI 54016' },
  { name: 'Boulder Lab', address: '4750 Nautilus Ct S, Boulder, CO 80301' },
];

const manualGeocodeMap = {
  '4120 Garfield Ave, Minneapolis, MN 55409': { lat: 44.9775, lon: -93.2488 },
  '140 104th Ln NW, Blaine MN 55448': { lat: 45.1542, lon: -93.2451 },
  '2393 Kalmia Ave, Boulder, CO 80304': { lat: 40.0208, lon: -105.2527 },
  '608 Spruce Dr, Hudson, WI 54016': { lat: 44.9739, lon: -92.7565 },
  '1727 W Highland Pkwy, St Paul, MN 55116': { lat: 44.9422, lon: -93.1695 },
  '1232 3rd St, Hudson, WI 54016': { lat: 44.9788, lon: -92.7423 },
  '14173 Flagstone Trail, Apple Valley MN 55124': { lat: 44.6877, lon: -93.2169 },
  '6525 France Ave, Edina, MN, 55435': { lat: 44.8669, lon: -93.3438 },
  '835 Nicollet Mall, Minneapolis, MN 55402': { lat: 44.9730, lon: -93.2726 },
  '2716 E 82nd St, Bloomington, MN 55425': { lat: 44.8403, lon: -93.1958 },
  '400 2nd St S, Hudson, WI 54016': { lat: 44.9739, lon: -92.7567 },
  '4750 Nautilus Ct S, Boulder, CO 80301': { lat: 39.9594, lon: -105.2179 },
};

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(coordA, coordB) {
  const earthRadiusMiles = 3958.8;
  const latDelta = toRadians(coordB.lat - coordA.lat);
  const lonDelta = toRadians(coordB.lon - coordA.lon);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(toRadians(coordA.lat)) *
      Math.cos(toRadians(coordB.lat)) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function getRandomDistance() {
  return Math.floor(Math.random() * 100) + 1;
}

function geocodeAddress(address) {
  return manualGeocodeMap[address.trim()] || null;
}

function getDistanceMiles(addressA, addressB) {
  const coordsA = geocodeAddress(addressA);
  const coordsB = geocodeAddress(addressB);

  if (coordsA && coordsB) {
    return {
      distanceMiles: Number(haversineDistance(coordsA, coordsB).toFixed(1)),
      method: 'Haversine',
      fallback: false,
    };
  }

  return {
    distanceMiles: getRandomDistance(),
    method: 'Random generator',
    fallback: true,
  };
}

function findNearestLab(patientAddress) {
  const result = labs.reduce((nearest, lab) => {
    const { distanceMiles } = getDistanceMiles(patientAddress, lab.address);
    return distanceMiles < nearest.distance ? { lab, distance: distanceMiles } : nearest;
  }, { lab: labs[0], distance: Infinity });

  if (result.distance === Infinity) {
    result.distance = getDistanceMiles(patientAddress, result.lab.address).distanceMiles;
  }

  return result;
}

function findBestClinician(patientAddress, includeLabDropoff) {
  let fallback = false;

  const best = clinicians.reduce((bestClinician, clinician) => {
    const clinicianToPatient = getDistanceMiles(clinician.address, patientAddress);
    let totalDistance = clinicianToPatient.distanceMiles;
    let method = clinicianToPatient.method;

    if (includeLabDropoff) {
      const nearestLabResult = findNearestLab(patientAddress);
      const patientToLab = getDistanceMiles(patientAddress, nearestLabResult.lab.address);
      const labToClinician = getDistanceMiles(nearestLabResult.lab.address, clinician.address);
      // Use the distance that was already calculated during lab selection to ensure consistency
      const finalPatientToLabDistance = patientToLab.distanceMiles;
      totalDistance = Number((clinicianToPatient.distanceMiles + finalPatientToLabDistance + labToClinician.distanceMiles).toFixed(1));
      method = patientToLab.method === 'Haversine' && labToClinician.method === 'Haversine' && clinicianToPatient.method === 'Haversine'
        ? 'Haversine'
        : 'Random generator';
      fallback = fallback || patientToLab.fallback || labToClinician.fallback;
      return totalDistance < bestClinician.distanceMiles
        ? { clinician, distanceMiles: totalDistance, nearestLab: nearestLabResult.lab, method }
        : bestClinician;
    }

    const roundTrip = Number((clinicianToPatient.distanceMiles * 2).toFixed(1));
    fallback = fallback || clinicianToPatient.fallback;
    return roundTrip < bestClinician.distanceMiles
      ? { clinician, distanceMiles: roundTrip, nearestLab: null, method }
      : bestClinician;
  }, { clinician: clinicians[0], distanceMiles: Infinity, nearestLab: null, method: 'Random generator' });

  return {
    clinicianName: best.clinician.name,
    clinicianAddress: best.clinician.address,
    distanceMiles: best.distanceMiles,
    method: best.method,
    labDropOffRequired: includeLabDropoff,
    nearestLab: best.nearestLab,
    fallback,
  };
}

function App() {
  const [patientAddress, setPatientAddress] = useState('');
  const [labDropOffRequired, setLabDropOffRequired] = useState(false);
  const [bestResult, setBestResult] = useState(null);

  const handleFindClinician = () => {
    const result = findBestClinician(patientAddress, labDropOffRequired);
    setBestResult(result);
  };

  return (
    <div className="App">
      <main className="form-container">
        <h1>Find Optimal Clinician</h1>

        <section className="form-section">
          <label htmlFor="patientAddress">Patient Address</label>
          <textarea
            id="patientAddress"
            value={patientAddress}
            onChange={(event) => setPatientAddress(event.target.value)}
            placeholder="Enter the patient's address"
            rows={4}
          />
        </section>

        <section className="form-section checkbox-section">
          <label className="checkbox-label" htmlFor="labDropOffRequired">
            <input
              id="labDropOffRequired"
              type="checkbox"
              checked={labDropOffRequired}
              onChange={(event) => setLabDropOffRequired(event.target.checked)}
            />
            Lab Drop-off Required
          </label>
        </section>

        <button className="action-button" type="button" onClick={handleFindClinician}>
          Find Optimal Clinician
        </button>

        {bestResult && (
          <section className="form-summary">
            <h2>Best Clinician</h2>
            <p>
              <strong>Name:</strong> {bestResult.clinicianName}
            </p>
            <p>
              <strong>Address:</strong> {bestResult.clinicianAddress}
            </p>
            <p>
              <strong>Total estimated round-trip distance:</strong> {bestResult.distanceMiles} miles
            </p>
            <p>
              <strong>Lab drop-off:</strong> {bestResult.labDropOffRequired ? 'Yes' : 'No'}
            </p>
            {bestResult.labDropOffRequired && bestResult.nearestLab && (
              <p>
                <strong>Nearest lab:</strong> {bestResult.nearestLab.name}
              </p>
            )}
            <p>
              <strong>Calculation method:</strong> {bestResult.method}
            </p>
            {bestResult.fallback && (
              <p className="note">
                Manual geocoding was not available for the patient address, so a random distance was used.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
