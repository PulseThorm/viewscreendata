var browserDataEl = document.getElementById("browserData");
var screenDataEl = document.getElementById("screenData");
var permissionsDataEl = document.getElementById("permissionsData");
var shareDataEl = document.getElementById("shareData");
var compatibilityDataEl = document.getElementById("compatibilityData");
var jsonOutputEl = document.getElementById("jsonOutput");
var previewEl = document.getElementById("preview");
var shareStateEl = document.getElementById("shareState");
var envStatusEl = document.getElementById("envStatus");
var refreshBtn = document.getElementById("refreshBtn");
var exportBtn = document.getElementById("exportBtn");
var shareBtn = document.getElementById("shareBtn");
var stopShareBtn = document.getElementById("stopShareBtn");

var sharedStream = null;

function isObject(value) {
  return value !== null && typeof value === "object";
}

function toDisplay(value) {
  if (value === null || value === undefined) {
    return "N/D";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    if (value.some(function (item) {
      return isObject(item);
    })) {
      return JSON.stringify(value);
    }

    return value.join(", ");
  }

  if (isObject(value)) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return "[object]";
    }
  }

  return String(value);
}

function renderList(target, items) {
  var html = "";
  var i;

  for (i = 0; i < items.length; i += 1) {
    html += '<dl class="kv"><dt>' +
      items[i][0] +
      '</dt><dd>' +
      toDisplay(items[i][1]) +
      '</dd></dl>';
  }

  target.innerHTML = html;
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return '"[unserializable]"';
  }
}

function supportsPermissionsApi() {
  return !!(navigator.permissions && navigator.permissions.query);
}

function supportsScreenShare() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}

function supportsNetworkInfo() {
  return !!navigator.connection;
}

function isTizenRuntime() {
  return !!window.tizen || /Tizen/i.test(navigator.userAgent || "");
}

function readPermissions() {
  var results = [];
  var names = ["geolocation", "camera", "microphone", "clipboard-read", "notifications"];
  var i;

  if (!supportsPermissionsApi()) {
    return Promise.resolve([["Permissions API", "No disponible"]]);
  }

  return names
    .reduce(function (chain, name) {
      return chain.then(function () {
        return navigator.permissions.query({ name: name })
          .then(function (status) {
            results.push([name, status.state]);
          })
          .catch(function () {
            results.push([name, "No soportado"]);
          });
      });
    }, Promise.resolve())
    .then(function () {
      return results;
    });
}

function buildShareInfo(stream) {
  var track = stream.getVideoTracks()[0];
  var settings = track && track.getSettings ? track.getSettings() : {};
  var capabilities = track && track.getCapabilities ? track.getCapabilities() : {};

  return {
    active: stream.active,
    trackLabel: track ? track.label : "N/D",
    trackState: track ? track.readyState : "N/D",
    settings: settings,
    capabilities: capabilities
  };
}

function collectData(extraShare) {
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var screen = window.screen || {};
  var viewport = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };

  var browser = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory !== undefined ? navigator.deviceMemory : "No disponible",
    maxTouchPoints: navigator.maxTouchPoints,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || "Ninguno",
    doNotTrack: navigator.doNotTrack !== undefined ? navigator.doNotTrack : "N/D",
    userAgentData: navigator.userAgentData
      ? {
          brands: navigator.userAgentData.brands,
          mobile: navigator.userAgentData.mobile,
          platform: navigator.userAgentData.platform
        }
      : "No disponible"
  };

  var screenData = {
    screenWidth: screen.width,
    screenHeight: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    devicePixelRatio: window.devicePixelRatio,
    orientation: screen.orientation && screen.orientation.type ? screen.orientation.type : "No disponible",
    viewport: viewport
  };

  var connectionData = {
    effectiveType: connection && connection.effectiveType ? connection.effectiveType : "No disponible",
    downlink: connection && connection.downlink !== undefined ? connection.downlink : "No disponible",
    rtt: connection && connection.rtt !== undefined ? connection.rtt : "No disponible",
    saveData: connection && connection.saveData !== undefined ? connection.saveData : "No disponible",
    type: connection && connection.type ? connection.type : "No disponible"
  };

  var compatibility = {
    tizenRuntime: isTizenRuntime(),
    permissionsApi: supportsPermissionsApi(),
    screenShareApi: supportsScreenShare(),
    networkInformationApi: supportsNetworkInfo(),
    storageEstimateApi: !!(navigator.storage && navigator.storage.estimate)
  };

  return {
    browser: browser,
    screenData: screenData,
    connectionData: connectionData,
    compatibility: compatibility,
    extraShare: extraShare,
    timestamp: new Date().toISOString()
  };
}

function updateShareUi(active) {
  if (active) {
    shareBtn.disabled = true;
    stopShareBtn.disabled = false;
    shareStateEl.textContent = "Compartiendo";
    shareStateEl.classList.remove("muted");
  } else {
    shareBtn.disabled = false;
    stopShareBtn.disabled = true;
    shareStateEl.textContent = "Sin captura";
    shareStateEl.classList.add("muted");
  }
}

function refreshView() {
  var permissions;
  var snapshot;

  envStatusEl.textContent = "Actualizando";

  return readPermissions().then(function (permissionsResult) {
    permissions = permissionsResult;
    snapshot = collectData(sharedStream ? buildShareInfo(sharedStream) : null);
    snapshot.connectionData.permissions = permissions;

    renderList(browserDataEl, Object.keys(snapshot.browser).map(function (key) {
      return [key, snapshot.browser[key]];
    }));

    renderList(screenDataEl, Object.keys(snapshot.screenData).map(function (key) {
      return [key, snapshot.screenData[key]];
    }));

    renderList(permissionsDataEl, Object.keys(snapshot.connectionData).map(function (key) {
      return [key, snapshot.connectionData[key]];
    }));

    if (snapshot.extraShare) {
      renderList(shareDataEl, Object.keys(snapshot.extraShare).map(function (key) {
        return [key, snapshot.extraShare[key]];
      }));
    } else {
      shareDataEl.innerHTML = '<dl class="kv"><dt>Estado</dt><dd>Sin pantalla compartida activa</dd></dl>';
    }

    renderList(compatibilityDataEl, Object.keys(snapshot.compatibility).map(function (key) {
      return [key, snapshot.compatibility[key]];
    }));

    jsonOutputEl.textContent = JSON.stringify(snapshot, null, 2);
    envStatusEl.textContent = "Listo";
  }).catch(function (error) {
    console.warn(error);
    envStatusEl.textContent = "Error";
  });
}

function startShare() {
  var stream;
  var track;

  if (!supportsScreenShare()) {
    alert("Tu navegador no soporta captura de pantalla con getDisplayMedia.");
    return;
  }

  navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    })
    .then(function (result) {
      stream = result;
      sharedStream = stream;
      previewEl.srcObject = stream;
      updateShareUi(true);

      track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener("ended", stopShare);
      }

      return refreshView();
    })
    .catch(function (error) {
      console.warn(error);
      alert("No se pudo iniciar la comparticion de pantalla.");
    });
}

function stopShare() {
  var stream;
  var tracks;
  var i;

  if (!sharedStream) {
    return;
  }

  stream = sharedStream;
  sharedStream = null;
  tracks = stream.getTracks();

  for (i = 0; i < tracks.length; i += 1) {
    tracks[i].stop();
  }

  previewEl.srcObject = null;
  updateShareUi(false);
  shareDataEl.innerHTML = '<dl class="kv"><dt>Estado</dt><dd>Sin pantalla compartida activa</dd></dl>';
  refreshView();
}

function downloadJSON() {
  var payload = jsonOutputEl.textContent || "{}";
  var blob = new Blob([payload], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");

  a.href = url;
  a.download = "viewscreendata.json";
  a.click();
  URL.revokeObjectURL(url);
}

refreshBtn.addEventListener("click", refreshView);
exportBtn.addEventListener("click", downloadJSON);
shareBtn.addEventListener("click", startShare);
stopShareBtn.addEventListener("click", stopShare);

window.addEventListener("resize", refreshView);
window.addEventListener("online", refreshView);
window.addEventListener("offline", refreshView);

if (!supportsScreenShare()) {
  shareBtn.disabled = true;
  shareBtn.title = "No disponible en este navegador";
}

refreshView();
