async function test() {
  const vRes = await fetch('http://localhost:3001/map/search?q=Versova').then(r => r.json());
  const gRes = await fetch('http://localhost:3001/map/search?q=Ghatkopar').then(r => r.json());
  const vId = vRes.features[0].id;
  const gId = gRes.features[0].id;
  console.log('Versova ID:', vId, 'Ghatkopar ID:', gId);
  const jRes = await fetch(`http://localhost:3001/journeys?from=${vId}&to=${gId}`).then(r => r.json());
  console.log('Journey Result:', JSON.stringify(jRes, null, 2));
}

test().catch(console.error);
