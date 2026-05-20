const expectedHeaders = [
  "ST Codi",
  "#",
  "Centre",
  "Canvis",
  "T",
  "ESP",
  "→e",
  "SEU",
  "→s",
  "Adreça",
  "CP",
  "Municipi",
  "E-mail",
  "Telèfon",
  "C",
  "Administratiu SDWAN/WAN",
  "IP pública",
  "Vel",
  "Tipus WAN",
  "LAN",
  "Sonda",
  "Telefonia",
  "Admin telefonia",
  "Tipus centre",
  "ID Seu",
  "Nom seu",
  "→m",
  "→ic",
  "Site",
  "ConnCodi",
  "C#",
  "ConnCentre",
  "Latitud",
  "Longitud",
];

const primaryFields = ["IP pública", "Proveïdor SD-WAN", "Vel", "Tipus WAN", "LAN", "Sonda", "Telefonia"];
const identityFields = ["ST Codi", "Codi", "Codi centre", "Centre", "Municipi"];
const centreSheetCsvFields = [
  "Adreça",
  "CP",
  "Municipi",
  "E-mail",
  "Telèfon",
  "Tipus centre",
  "Latitud",
  "Longitud",
];
const usedConnectivityFields = new Set([...primaryFields, ...identityFields, ...centreSheetCsvFields]);
const socrataEndpoint = "https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json";
const fullCentreSheetUrl = "https://rbarrachina.github.io/fitxa-centres-educatius/";

const state = {
  rows: [],
  headers: [],
  matches: [],
  initialQuery: "",
};

const csvFile = document.querySelector("#csvFile");
const searchInput = document.querySelector("#searchInput");
const results = document.querySelector("#results");
const template = document.querySelector("#resultTemplate");
const uploadPill = document.querySelector("#uploadPill");
const rowCount = document.querySelector("#rowCount");
const matchCount = document.querySelector("#matchCount");
const appInfoBtn = document.querySelector("#appInfoBtn");
const aboutModal = document.querySelector("#aboutModal");
const closeAboutModalBtn = document.querySelector("#closeAboutModalBtn");

csvFile.addEventListener("change", handleFile);
searchInput.addEventListener("input", renderMatches);
appInfoBtn.addEventListener("click", openAboutModal);
closeAboutModalBtn.addEventListener("click", closeAboutModal);
aboutModal.addEventListener("click", (event) => {
  if (event.target === aboutModal) closeAboutModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAboutModal();
});
applyUrlSearch();

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = parseDelimited(text);
    state.headers = parsed.headers;
    state.rows = parsed.rows;
    searchInput.disabled = state.rows.length === 0;
    if (!searchInput.value && state.initialQuery) {
      searchInput.value = state.initialQuery;
    }
    updateStats([]);
    uploadPill.textContent = "CSV carregat correctament";
    renderMatches();
  } catch (error) {
    state.rows = [];
    state.headers = [];
    searchInput.disabled = true;
    showEmpty("No s'ha pogut llegir el CSV", error.message || "Revisa el format del fitxer.");
  }
}

function parseDelimited(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) throw new Error("El fitxer és buit.");

  const delimiter = detectDelimiter(normalized);
  const table = parseRows(normalized, delimiter).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (table.length < 2) throw new Error("Cal una capçalera i almenys un registre.");

  const headers = table[0].map((header) => normalizeHeader(header));
  const rows = table.slice(1).map((cells) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] || "").trim();
    });
    return row;
  });

  return { headers, rows };
}

function detectDelimiter(text) {
  const firstLine = text.split("\n", 1)[0];
  const delimiters = ["\t", ";", ","];
  return delimiters
    .map((delimiter) => ({ delimiter, count: splitCsvLine(firstLine, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseRows(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" && !inQuotes) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function splitCsvLine(line, delimiter) {
  return parseRows(line, delimiter)[0] || [];
}

function normalizeHeader(header) {
  const trimmed = header.trim();
  const known = expectedHeaders.find((candidate) => simplify(candidate) === simplify(trimmed));
  return known || trimmed;
}

function renderMatches() {
  const query = simplify(searchInput.value);
  updateSearchUrl(searchInput.value);
  const matches = query
    ? state.rows.filter((row) => searchTarget(row).includes(query))
    : state.rows.slice(0, 30);

  state.matches = matches;
  updateStats(matches);

  if (!state.rows.length) {
    showEmpty("Carrega un fitxer per començar", "Després podràs buscar per codi, centre o municipi.");
    return;
  }

  if (!query) {
    updateStats([]);
    showEmpty("Escriu una cerca", "Busca per codi, nom de centre o població per veure resultats.");
    return;
  }

  if (!matches.length) {
    showEmpty("Cap resultat", "Prova amb un altre codi, nom de centre o municipi.");
    return;
  }

  results.replaceChildren(...matches.map((row) => buildResult(row)));
}

function buildResult(row) {
  const node = template.content.firstElementChild.cloneNode(true);
  const code = getCentreCode(row);
  const centre = getValue(row, ["Centre", "ConnCentre"]) || "Centre sense nom";
  const municipality = getValue(row, ["Municipi"]) || "Municipi no informat";

  node.querySelector(".code-line").textContent = code ? `Codi centre ${code}` : "Codi no informat";
  node.querySelector(".centre-name").textContent = centre;
  node.querySelector(".municipality-line").textContent = municipality;
  node.querySelector(".main-data").replaceChildren(
    ...primaryFields.map((field) => buildDefinition(field, getPrimaryValue(row, field)))
  );

  const infoButton = node.querySelector(".info-button");
  const connectivityButton = node.querySelector(".connectivity-button");
  const centreDetails = node.querySelector(".centre-details");
  const connectivityDetails = node.querySelector(".connectivity-details");

  infoButton.addEventListener("click", () => toggleCentreDetails(row, centreDetails, infoButton));
  connectivityButton.addEventListener("click", () => {
    const isHidden = connectivityDetails.hidden;
    connectivityDetails.hidden = !isHidden;
    connectivityButton.textContent = isHidden ? "Amaga connectivitat" : "Més informació connectivitat";
    if (isHidden && !connectivityDetails.dataset.ready) {
      connectivityDetails.replaceChildren(buildConnectivityDetails(row));
      connectivityDetails.dataset.ready = "true";
    }
  });

  return node;
}

async function toggleCentreDetails(row, panel, button) {
  const isHidden = panel.hidden;
  panel.hidden = !isHidden;
  button.textContent = isHidden ? "Amaga fitxa centre" : "Fitxa centre";
  if (!isHidden || panel.dataset.ready) return;

  panel.innerHTML = '<p class="notice">Carregant la fitxa pública del centre...</p>';
  try {
    const centre = await fetchCentreDetails(row);
    panel.replaceChildren(buildCentreDetails(row, centre));
  } catch (error) {
    panel.innerHTML = "";
    panel.append(
      buildNotice(
        "No s'ha pogut carregar la fitxa pública. Pots continuar consultant les dades del CSV o obrir la font del projecte."
      )
    );
  }
  panel.dataset.ready = "true";
}

async function fetchCentreDetails(row) {
  const code = getCentreCode(row);
  if (!code) return null;

  const url = new URL(socrataEndpoint);
  url.searchParams.set("codi_centre", code);
  url.searchParams.set("$limit", "1");

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return data[0] || null;
}

function buildCentreDetails(row, centre) {
  const wrapper = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = "Fitxa del centre";
  wrapper.append(title);

  if (!centre) {
    wrapper.append(
      buildNotice("No s'ha trobat cap fitxa pública amb aquest codi de centre al dataset de centres docents.")
    );
  } else {
    const fields = [
      ["Nom complet", centre.denominaci_completa || centre.nom_centre],
      ["Naturalesa", centre.nom_naturalesa],
      ["Titularitat", centre.nom_titularitat],
      ["Adreça", centre.adre_a || centre.adreca],
      ["Codi postal", centre.codi_postal],
      ["Municipi", centre.nom_municipi],
      ["Comarca", centre.nom_comarca],
      ["Servei territorial", centre.nom_servei_territorial],
      ["Telèfon", centre.telefon],
      ["Web", centre.url, "url"],
      ["Coordenades", formatCoordinates(centre)],
    ];
    wrapper.append(buildFieldGrid(fields));
  }
  if (centre) {
    const fullSheetLink = buildFullCentreSheetLink(getCentreCode(row));
    if (fullSheetLink) {
      wrapper.append(fullSheetLink);
    }
  }
  return wrapper;
}

function buildFullCentreSheetLink(code) {
  if (!code) return null;
  const url = new URL(fullCentreSheetUrl);
  url.searchParams.set("codi", code);

  const wrapper = document.createElement("div");
  wrapper.className = "full-sheet-box";

  const label = document.createElement("p");
  label.className = "muted";
  label.textContent = "Més informació i mapes del centre:";

  const link = document.createElement("a");
  link.className = "full-sheet-link";
  link.href = url.toString();
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = url.toString();

  wrapper.append(label, link);
  return wrapper;
}

function buildConnectivityDetails(row) {
  const wrapper = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = "Dades restants del full de connectivitat";
  wrapper.append(title);

  const fields = state.headers
    .filter((header) => !usedConnectivityFields.has(header))
    .map((header) => [header, row[header]]);

  wrapper.append(fields.length ? buildFieldGrid(fields) : buildNotice("No hi ha més camps disponibles al CSV."));
  return wrapper;
}

function getPrimaryValue(row, field) {
  if (field === "Proveïdor SD-WAN") {
    return getSdWanProvider(row["IP pública"]);
  }
  return row[field];
}

function getSdWanProvider(publicIp) {
  const ip = String(publicIp || "").trim();
  return ip.startsWith("85.192.70.") || ip.startsWith("85.192.71.") ? "XOC" : "Telefònica";
}

function buildFieldGrid(fields) {
  const grid = document.createElement("dl");
  grid.className = "field-grid";
  fields
    .filter(([, value]) => hasValue(value))
    .forEach(([label, value, type]) => grid.append(buildDefinition(label, value, type)));

  if (!grid.childElementCount) {
    return buildNotice("Sense dades informades.");
  }
  return grid;
}

function buildDefinition(label, value, type = "") {
  const item = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  if (type === "url" && hasValue(value)) {
    const link = document.createElement("a");
    link.className = "field-link";
    link.href = ensureUrl(value);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = value;
    description.append(link);
  } else {
    description.textContent = hasValue(value) ? value : "No informat";
  }
  item.append(term, description);
  return item;
}

function buildNotice(message) {
  const notice = document.createElement("p");
  notice.className = "notice";
  notice.textContent = message;
  return notice;
}

function updateStats(matches) {
  rowCount.textContent = state.rows.length.toString();
  matchCount.textContent = matches.length.toString();
}

function showEmpty(title, message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>`;
  results.replaceChildren(empty);
}

function searchTarget(row) {
  return simplify([getCentreCode(row), getValue(row, ["Centre", "ConnCentre"]), row.Municipi].join(" "));
}

function getCentreCode(row) {
  return getValue(row, ["ST Codi", "Codi", "Codi centre", "ConnCodi"])?.replace(/\D/g, "") || "";
}

function getValue(row, fields) {
  for (const field of fields) {
    if (hasValue(row[field])) return row[field].trim();
  }
  return "";
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function simplify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatCoordinates(centre) {
  const lat = centre.latitud || centre.geo_lat || centre.latitude;
  const lon = centre.longitud || centre.geo_lon || centre.longitude;
  return lat && lon ? `${lat}, ${lon}` : "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openAboutModal() {
  aboutModal.hidden = false;
}

function closeAboutModal() {
  aboutModal.hidden = true;
}

function applyUrlSearch() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  if (query) {
    state.initialQuery = query;
    searchInput.value = query;
  }
}

function updateSearchUrl(value) {
  const url = new URL(window.location.href);
  const trimmed = value.trim();
  if (trimmed) {
    url.searchParams.set("q", trimmed);
  } else {
    url.searchParams.delete("q");
  }
  window.history.replaceState({}, "", url);
}

function ensureUrl(value) {
  const trimmed = String(value).trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
