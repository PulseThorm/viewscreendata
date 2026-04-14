var browserDataEl = document.getElementById("browserData");
var screenDataEl = document.getElementById("screenData");
var compatibilityDataEl = document.getElementById("compatibilityData");
var screenIdValueEl = document.getElementById("screenIdValue");
var refreshBtn = document.getElementById("refreshBtn");
var SCREEN_ID_STORAGE_KEY = "viewscreendata.screenId";

function getTimeZone() {
  try {
    if (window.Intl && Intl.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "No disponible";
    }
  } catch (error) {}

  return "No disponible";
}

function getOrCreateScreenId() {
  var existing;

  try {
    existing = window.localStorage ? localStorage.getItem(SCREEN_ID_STORAGE_KEY) : null;
  } catch (error) {
    existing = null;
  }

  if (existing) {
    return existing;
  }

  existing = "sid-" + String(new Date().getTime()) + "-" + String(Math.floor(Math.random() * 1000000));

  try {
    if (window.localStorage) {
      localStorage.setItem(SCREEN_ID_STORAGE_KEY, existing);
    }
  } catch (error) {}

  return existing;
}

function getConnectionValue(key) {
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return "No disponible";
  }

  return connection[key] !== undefined && connection[key] !== null ? connection[key] : "No disponible";
}

function supportsNetworkInfo() {
  return !!(navigator.connection || navigator.mozConnection || navigator.webkitConnection);
}

function isTizenRuntime() {
  return !!window.tizen || /Tizen/i.test(navigator.userAgent || "");
}

function renderRows(target, rows) {
  var html = "";
  var i;

  for (i = 0; i < rows.length; i += 1) {
    html += '<div class="row"><div class="key">' + rows[i][0] + '</div><div class="value">' + rows[i][1] + '</div></div>';
  }

  target.innerHTML = html;
}

function collectSnapshot() {
  var screen = window.screen || {};
  var screenId = getOrCreateScreenId();

  return {
    screenId: screenId,
    browser: [
      ["screenId", screenId],
      ["userAgent", navigator.userAgent],
      ["platform", navigator.platform],
      ["language", navigator.language],
      ["cookies", navigator.cookieEnabled],
      ["online", navigator.onLine],
      ["hardwareConcurrency", navigator.hardwareConcurrency || "No disponible"],
      ["deviceMemory", navigator.deviceMemory !== undefined ? navigator.deviceMemory : "No disponible"],
      ["maxTouchPoints", navigator.maxTouchPoints || 0],
      ["timeZone", getTimeZone()],
      ["referrer", document.referrer || "Ninguno"]
    ],
    screenData: [
      ["width", screen.width],
      ["height", screen.height],
      ["availWidth", screen.availWidth],
      ["availHeight", screen.availHeight],
      ["colorDepth", screen.colorDepth],
      ["pixelDepth", screen.pixelDepth],
      ["pixelRatio", window.devicePixelRatio],
      ["innerWidth", window.innerWidth],
      ["innerHeight", window.innerHeight]
    ],
    compatibility: [
      ["tizenRuntime", isTizenRuntime()],
      ["permissionsApi", !!(navigator.permissions && navigator.permissions.query)],
      ["networkInformationApi", supportsNetworkInfo()],
      ["storageApi", !!window.localStorage]
    ]
  };
}

function refreshView() {
  var snapshot = collectSnapshot();

  screenIdValueEl.innerHTML = snapshot.screenId;
  renderRows(browserDataEl, snapshot.browser);
  renderRows(screenDataEl, snapshot.screenData);
  renderRows(compatibilityDataEl, snapshot.compatibility);
}

refreshBtn.onclick = refreshView;
window.onresize = refreshView;
window.onload = refreshView;
