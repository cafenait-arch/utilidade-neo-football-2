let db = null;
let countries = [];
let namesData = [];

const positions = ["GOL","DEF","MEI","ATA"];

const overallRanges = [
  { min: 51, max: 60, weight: 5.3 },
  { min: 61, max: 70, weight: 10 },
  { min: 71, max: 80, weight: 25 },
  { min: 81, max: 90, weight: 25 },
  { min: 91, max: 100, weight: 22 },
  { min: 101, max: 110, weight: 5 },
  { min: 111, max: 120, weight: 2 },
  { min: 121, max: 200, weight: 0.7 },
];

// --- AUTO LOAD data.db ---
async function loadDB() {
  const status = document.getElementById("db-status");
  try {
    const SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` });
    const res = await fetch("data.db");
    if (!res.ok) throw new Error("Arquivo data.db não encontrado. Coloque-o na mesma pasta.");
    const buf = await res.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buf));

    const countryRows = db.exec("SELECT id, name, continentId, namesCountryId FROM Country");
    if (countryRows.length > 0) {
      countries = countryRows[0].values.map(r => ({ id: r[0], name: r[1], continentId: r[2], namesCountryId: r[3] }));
    }

    const nameRows = db.exec("SELECT name, firstName, weight, namesCountryId FROM PlayerFicticiousName");
    if (nameRows.length > 0) {
      namesData = nameRows[0].values.map(r => ({ name: r[0], firstName: r[1], weight: r[2], namesCountryId: r[3] }));
    }

    populateCountries();
    document.getElementById("country").disabled = false;
    document.getElementById("gen-btn").disabled = false;
    status.textContent = `✅ ${countries.length} países, ${namesData.length} nomes`;
    status.className = "status success";
  } catch (err) {
    status.textContent = "❌ " + err.message;
    status.className = "status error";
    console.error(err);
  }
}

// --- LOGIC ---
function weightedRandom(items, getWeight) {
  const total = items.reduce((s, i) => s + getWeight(i), 0);
  let r = Math.random() * total;
  for (const item of items) { r -= getWeight(item); if (r <= 0) return item; }
  return items[items.length - 1];
}

function randomOverall() {
  const range = weightedRandom(overallRanges, r => r.weight);
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getNamesByCountry(namesCountryId) {
  const filtered = namesData.filter(n => n.namesCountryId === namesCountryId);
  return { firstNames: filtered.filter(n => n.firstName === 0), lastNames: filtered.filter(n => n.firstName === 1) };
}

function pickWeightedName(nameList) {
  if (nameList.length === 0) return "Desconhecido";
  return weightedRandom(nameList, n => n.weight).name;
}

function generatePlayer(countryId) {
  const country = countryId ? countries.find(c => c.id === countryId) : randomFrom(countries);
  if (!country) return null;
  const { firstNames, lastNames } = getNamesByCountry(country.namesCountryId);
  return { name: `${pickWeightedName(firstNames)} ${pickWeightedName(lastNames)}`, country: country.name, position: randomFrom(positions), overall: randomOverall() };
}

function getOvrClass(ovr) {
  if (ovr <= 70) return "ovr-low";
  if (ovr <= 85) return "ovr-mid";
  if (ovr <= 100) return "ovr-high";
  if (ovr <= 120) return "ovr-elite";
  return "ovr-legend";
}

// --- UI ---
function populateCountries() {
  const sel = document.getElementById("country");
  sel.innerHTML = '<option value="all">Todas</option>';
  countries.forEach(c => { const o = document.createElement("option"); o.value = c.id; o.textContent = c.name; sel.appendChild(o); });
}

document.getElementById("gen-btn").addEventListener("click", () => {
  if (!db) return;
  const count = Math.min(Math.max(parseInt(document.getElementById("count").value) || 1, 1), 200);
  const countryVal = document.getElementById("country").value;
  const list = document.getElementById("player-list");
  list.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const p = generatePlayer(countryVal === "all" ? null : parseInt(countryVal));
    if (!p) continue;
    const card = document.createElement("div");
    card.className = "player-card";
    card.innerHTML = `<div class="name">${p.name}</div><div class="info">${p.country} · ${p.position}</div><div class="overall ${getOvrClass(p.overall)}">${p.overall}</div>`;
    list.appendChild(card);
  }
});

document.addEventListener("DOMContentLoaded", loadDB);