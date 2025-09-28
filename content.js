console.log('[CONTENT] Content Script geladen auf', window.location.href);

// Tab beim Background registrieren
chrome.runtime.sendMessage({ type: 'REGISTER_TAB' }, (res) => {
  console.log('[CONTENT] Tab registriert beim BG:', res);
});
// --- DOM-Funktionen ---
function readElement(selector) {
  const el = document.querySelector(selector);
  return el ? el.textContent.trim() : null;
}

function getCustomProp(selector, prop) {
  const el = document.querySelector(selector);
  return el ? el.getAttribute(prop) : null;
}

function getLastDataValue(attrName) {
    const elements = document.querySelectorAll(`[${attrName}]`);
    
    if (elements.length === 0) return null;

    const lastEl = elements[elements.length - 1];
    
    return lastEl.getAttribute(attrName);
}

function getTotalQueueTime(queueSelector) {
    // Alle <span> in der Dauer-Spalte sammeln
    const spans = document.querySelectorAll(`${queueSelector} td span`);
    let totalSeconds = 0;

    spans.forEach(span => {
        const parts = span.textContent.trim().split(':').map(Number); // ["0","11","04"] → [0,11,4]
        let seconds = 0;
        if (parts.length === 3) {
            // Stunden:Minuten:Sekunden
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            // Minuten:Sekunden
            seconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
            seconds = parts[0];
        }
        totalSeconds += seconds;
    });

    // Aktueller Zeitpunkt als Unix-Timestamp + totalSeconds
    const now = Math.floor(Date.now() / 1000);
    return now + totalSeconds;
}

function getBuildingInfo(building) {
    // Button für das Gebäude finden
    const buildBtn = document.querySelector(`a[data-building="${building}"]`);
    if (!buildBtn) return null;

    // Level: data-level-next - 1
    const levelNext = parseInt(buildBtn.getAttribute('data-level-next')) || 0;
    const level = levelNext - 1;

    // Zeile finden
    const row = buildBtn.closest('tr');
    if (!row) return null;

    // Kosten auslesen
    const wood = parseInt(row.querySelector('td.cost_wood')?.dataset.cost || 0);
    const stone = parseInt(row.querySelector('td.cost_stone')?.dataset.cost || 0);
    const iron = parseInt(row.querySelector('td.cost_iron')?.dataset.cost || 0);
    const population = parseInt(row.querySelector('td span.icon.header.population')?.parentElement.textContent.trim() || 0);

    return {
        
            level: level,
            cost: {
                wood: wood,
                stone: stone,
                iron: iron,
                population: population
            }
        
    };
}


function clickElement(selector) {
  const el = document.querySelector(selector);
  if (!el) return false;
  el.click();
  return true;
}

function getUrl(){
  return window.location.href
}

function fillInput(selector, value) {
  const el = document.querySelector(selector);
  if (!el) return false;

  el.focus();
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

// --- Prüfen ob Element existiert ---
function elementExists(selector) {
  return !!document.querySelector(selector);
}

// --- Nachrichten vom Background ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  let result = null;

  switch(msg.type) {
    case 'CLICK':
      result = clickElement(msg.selector);
      break;
    case 'FILL':
      result = fillInput(msg.selector, msg.value || '');
      break;
    case 'READ':
      result = readElement(msg.selector);
      break;
    case 'READCUST':
      result = getCustomProp(msg.selector, msg.prop)
      break;
    case 'EXISTS':
      result = elementExists(msg.selector);
      break;
    case 'URL':
      result = getUrl();
      break;
    case "GETBUILDINGINFO":
      result = getBuildingInfo(msg.building);
      break;
    case "LASTDATA":
      result = getLastDataValue(msg.selector);
      break;
    case "TIMEQUE":
      result = getTotalQueueTime(msg.selector);
      break;
    default:
      console.warn('[CONTENT] Unknown message type:', msg.type);
  }

  sendResponse({ ok: true, result });
  return true; // wichtig für async response
});
