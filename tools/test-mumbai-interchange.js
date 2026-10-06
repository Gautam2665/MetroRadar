async function testInterchange() {
  const oRes = await fetch('http://localhost:3001/map/search?q=Dahisar').then(r => r.json());
  const dRes = await fetch('http://localhost:3001/map/search?q=Versova').then(r => r.json());
  const oId = oRes.features[0].id;
  const dId = dRes.features[0].id;
  console.log('Origin:', oRes.features[0].properties.name, oId);
  console.log('Destination:', dRes.features[0].properties.name, dId);
  const jRes = await fetch(`http://localhost:3001/journeys?from=${oId}&to=${dId}`).then(r => r.json());
  console.log('Journey keys:', Object.keys(jRes));
  if (jRes.journey) {
    console.log('Summary:', jRes.journey.humanSummary, 'Duration:', jRes.journey.duration, 'Transfers:', jRes.journey.transfers);
    console.log('Legs:', jRes.journey.legs?.map(l => `${l.lineName}: ${l.fromStationName} -> ${l.toStationName}`));
  } else {
    console.log('Error/Response:', jRes);
  }
}

testInterchange().catch(console.error);
