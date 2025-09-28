console.log('[BG] Background Worker gestartet');

// ----------------------------
// Spiel-Tab verwalten
// ----------------------------
let gameTabId = null;
let bot = null
const unitcosts = { "spear": { "wood": 50, "stone": 30, "iron": 10, "pop": 1 }, }

// Nachricht vom Content Script empfangen
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    // Tab beim Background registrieren
    case 'REGISTER_TAB':
      if (sender.tab) {
        gameTabId = sender.tab.id;
        chrome.storage.local.set({ gameTabId }); // optional: für Persistenz
        console.log('[BG] Spiel-Tab registriert:', gameTabId);
        sendResponse({ ok: true });
      }
      break;

    default:
      console.warn('[BG] Unknown message type:', msg.type);
      sendResponse({ ok: false });
  }
  return true; // wichtig für async response
});

// ----------------------------
// Funktion, um Content Script zu triggern
// ----------------------------
async function sendToContent(msg) {
  if (!gameTabId) {
    console.warn('[BG] Kein registrierter Spiel-Tab!');

    return null;
  }
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(gameTabId, msg, (res) => {
      if (chrome.runtime.lastError) {
        console.warn('[BG] sendMessage Fehler:', chrome.runtime.lastError.message);
        //gameTabId=null
        resolve(null);
        return;
      }
      resolve(res.result);
    });
  });
}

// ----------------------------
// Test-Aktionen (z.B. Login)
// ----------------------------
async function login() {
  // Prüfen, ob Login-Feld existiert
  const loginFieldExists = await sendToContent({ type: 'EXISTS', selector: '#user' });
  if (!loginFieldExists) {
    const wordbuttonexists = await sendToContent({ type: 'EXISTS', selector: '.world_button_active' });
    if (wordbuttonexists) {
      await sendToContent({ type: 'CLICK', selector: '.world_button_active' });
      return;
    }
  }

  // Input füllen
  await sendToContent({ type: 'FILL', selector: '#user', value: '*' });
  await sendToContent({ type: 'FILL', selector: '#password', value: '+' });
  await sleep(500)
  // Button klicken
  await sendToContent({ type: 'CLICK', selector: '.btn-login' });

  for (let i = 0; i < 500; i++) {
    await sleep(100);
    const wordbuttonexists = await sendToContent({ type: 'EXISTS', selector: '.world_button_active' });
    if (wordbuttonexists) { break; }
  }
  await sendToContent({ type: 'CLICK', selector: '.world_button_active' });
}

// ----------------------------
// Manuell starten via Toolbar
// ----------------------------
// chrome.action.onClicked.addListener(() => {
//   login();
// });

class Bot {
  constructor() {
    this.wood = 0;
    this.iron = 0;
    this.stone = 0;
    this.freepop = 0;
    this.storage = 0;
    this.buildings = {
      "main": 0,
      "wood": 0,
      "stone": 0,
      "iron": 0,
      "barracks": 0,
      "stable": 0,
      "farm": 0,
      "storage": 0,
      "smith": 0,
      "wall": 0,
      "market": 0,
      "statue": 0
    }
    this.needStorage = 0;
    this.needFarm = 0;
    this.buildingEndtime = 0;
    this.kaserneEndtime = 0;
  }

  async resGet() {
    let wood = await sendToContent({ type: 'READ', selector: '#wood' });
    if (wood) { this.wood = Number(wood) }
    let stone = await sendToContent({ type: 'READ', selector: '#stone' });
    if (stone) { this.stone = Number(stone) }
    let iron = await sendToContent({ type: 'READ', selector: '#iron' });
    if (iron) { this.iron = Number(iron) }
    let pop_max = await sendToContent({ type: 'READ', selector: '#pop_max_label' });
    let pop_current = await sendToContent({ type: 'READ', selector: '#pop_current_label' });
    if (pop_max && pop_current) {
      this.freepop = Number(pop_max) - Number(pop_current)
    }
    let storage = await sendToContent({ type: 'READ', selector: '#storage' });
    if (storage) {
      this.storage = Number(storage)
    }
  }

  async gotoOverview() {
    //'a[href*="screen=overview"]'
    await sendToContent({ type: 'CLICK', selector: 'a[href*="screen=overview"]' });
    await sleep(500);
  }

  async gotoMain() {
    if (!await sendToContent({ type: 'EXISTS', selector: 'a[href*="screen=main"]' })) {
      await this.gotoOverview()
    }
    await sendToContent({ type: 'CLICK', selector: 'a[href*="screen=main"]' });
    await sleep(500);
  }

  async getBuildings() {
    //
    if (!await sendToContent({ type: 'EXISTS', selector: '#building_wrapper' })) {
      console.log("gotomain")
      await this.gotoMain()
    }
    //[data-building="main"]
    //data-level-next
    let main = await sendToContent({ type: 'GETBUILDINGINFO', building: 'main' })
    if (main) { this.buildings.main = main }
    else { this.buildings.main = { "level": 30 } }
    let barracks = await sendToContent({ type: 'GETBUILDINGINFO', building: 'barracks' })
    if (barracks) { this.buildings.barracks = barracks }
    else { this.buildings.barracks = { "level": 30 } }
    let stable = await sendToContent({ type: 'GETBUILDINGINFO', building: 'stable' })
    if (stable) { this.buildings.stable = stable }
    else { this.buildings.stable = { "level": 30 } }
    let smith = await sendToContent({ type: 'GETBUILDINGINFO', building: 'smith' })
    if (smith) { this.buildings.smith = smith }
    else { this.buildings.smith = { "level": 30 } }
    let statue = await sendToContent({ type: 'GETBUILDINGINFO', building: 'statue' })
    if (statue) { this.buildings.statue = statue }
    else { this.buildings.statue = { "level": 30 } }

    let wood = await sendToContent({ type: 'GETBUILDINGINFO', building: 'wood' })
    if (wood) { this.buildings.wood = wood }
    else { this.buildings.wood = { "level": 30 } }

    let stone = await sendToContent({ type: 'GETBUILDINGINFO', building: 'stone' })
    if (stone) { this.buildings.stone = stone }
    else { this.buildings.stone = { "level": 30 } }

    let iron = await sendToContent({ type: 'GETBUILDINGINFO', building: 'iron' })
    if (iron) { this.buildings.iron = iron }
    else { this.buildings.iron = { "level": 30 } }

    let farm = await sendToContent({ type: 'GETBUILDINGINFO', building: 'farm' })
    if (farm) { this.buildings.farm = farm }
    else { this.buildings.farm = { "level": 30 } }

    let storage = await sendToContent({ type: 'GETBUILDINGINFO', building: 'storage' })
    if (storage) { this.buildings.storage = storage }
    else { this.buildings.storage = { "level": 30 } }

    let wall = await sendToContent({ type: 'GETBUILDINGINFO', building: 'wall' })
    if (wall) { this.buildings.wall = wall }
    else { this.buildings.wall = { "level": 30 } }

    let market = await sendToContent({ type: 'GETBUILDINGINFO', building: 'market' })
    if (market) { this.buildings.market = market }
    else { this.buildings.market = { "level": 30 } }

  }

  async getNextQuest() {
    const timeflag = Date.now() / 1000
    if (this.needFarm) { return { "quest": "build", "building": "farm" } }
    if (this.needStorage) { return { "quest": "build", "building": "storage" } }
    const minesunder5 = this.ensureMines5();
    if (minesunder5) return { quest: "build", building: minesunder5 };
    const mainunder5 = this.ensureMain5();
    if (mainunder5) return { quest: "build", building: mainunder5 };
    const barracksunder2 = this.ensureKaserne2();
    if (barracksunder2) return { quest: "build", building: barracksunder2 };
    if (timeflag > this.kaserneEndtime) {
      return { quest: "recruit", unit: "spear" };
    }
    const minesunder10 = this.ensureMines10();
    if (minesunder10) return { quest: "build", building: minesunder10 };

  }

  ensureMain5() {
    if (this.buildings.main.level < 5) {
      return "main"
    }
  }

  ensureMines5() {
    const buildingKeys = ['wood', 'stone', 'iron'];
    // Array mit Gebäuden, deren level < 5 ist
    const lowBuildings = buildingKeys
      .map(key => {
        const b = this.buildings[key];
        if (!b) return null;
        return { name: key, level: b.level };
      })
      .filter(b => b && b.level < 5);
    if (lowBuildings.length === 0) return null;
    // Nimm das Gebäude mit dem niedrigsten Level
    lowBuildings.sort((a, b) => a.level - b.level);
    return lowBuildings[0].name;
  }

  ensureMines10() {
    const buildingKeys = ['wood', 'stone', 'iron'];
    // Array mit Gebäuden, deren level < 5 ist
    const lowBuildings = buildingKeys
      .map(key => {
        const b = this.buildings[key];
        if (!b) return null;
        return { name: key, level: b.level };
      })
      .filter(b => b && b.level < 10);
    if (lowBuildings.length === 0) return null;
    // Nimm das Gebäude mit dem niedrigsten Level
    lowBuildings.sort((a, b) => a.level - b.level);
    return lowBuildings[0].name;
  }

  ensureKaserne2() {
    if (this.buildings.barracks.level < 2) {
      return "barracks"
    }
  }

  canAffordBuilding(building) {
    const now = Date.now() / 1000;
    if (now < this.buildingEndtime) {
      return false;
    }

    const buildingobject = this.buildings[building];
    if (['wood', 'stone', 'iron'].some(res => buildingobject.cost[res] > this.storage)) {
      this.needStorage = true;
      return false;
    }

    if (buildingobject.cost.population > this.freepop) {
      this.needFarm = true;
      return false;
    }
    if (['wood', 'stone', 'iron'].some(res => buildingobject.cost[res] > this[res])) {
      return false;
    }
    return true;
  }

  canAffordUnit(unit) {
    const unitobject = unitcosts[unit];
    if (unitobject.pop > this.freepop) {
      this.needFarm = true;
      return false;
    }
    if (['wood', 'stone', 'iron'].some(res => unitobject[res] > this[res])) {
      return false;
    }
    return true;
  }

  async build(building) {
    await this.gotoMain()
    await sendToContent({ type: 'CLICK', selector: `a[data-building="${building}"]` });
    await sleep(500)
    const lastdata = await sendToContent({ type: 'LASTDATA', selector: 'data-endtime' })
    if (lastdata) {
      this.buildingEndtime = lastdata;
      console.log(this.buildingEndtime)
    }
    await sleep(2000)
    await this.getBuildings()
  }

  async main() {
    await sleep(2000)
    while (!gameTabId) { await sleep(100) }
    await sleep(500)
    await this.getBuildings()
    await sleep(500)

    while (true) {
      if (!gameTabId) {
        await sleep(100)
        continue
      }
      const isLogged = await sendToContent({ type: 'EXISTS', selector: '#menu_row' });
      if (!isLogged) {
        console.log("Login versuch wird ausgeführt")
        await login();
        await sleep(1000)
      }

      //quest-popup-container
      if (await sendToContent({ type: 'EXISTS', selector: '.quest-popup-container' })) {
        await sleep(10000)
        //popup_box_close 
        await sendToContent({ type: 'CLICK', selector: '.popup_box_close' })
        await sleep(400)
      }


      await this.resGet();
      //console.log(`Holz: ${this.wood} Stone: ${this.stone} Iron: ${this.iron}`)
      //console.log(this.buildings)
      let quest = await this.getNextQuest()
      if (quest != null) {
        switch (quest.quest) {
          case "build":
            console.log(`Bau von ${quest.building} soll ausgeführt werden`)
            if (this.canAffordBuilding(quest.building)) {
              console.log(`Bau von ${quest.building} wird gebaut`)
              await this.build(quest.building)
            }
            break;
          case "recruit":
            console.log(`Rekutierung von ${quest.unit} gewünscht`)
          default:
            break;
        }
      }
      await sleep(2000)
    }
  }
}



// Call start
(async () => {
  bot = new Bot()
  await bot.main()
})();

function sleep(ms) {
  const variation = ms * 0.1; // 10% vom Basiswert
  const randomOffset = (Math.random() * 2 - 1) * variation; // zwischen -10% und +10%
  const finalDelay = ms + randomOffset;

  return new Promise(resolve => setTimeout(resolve, finalDelay));
}