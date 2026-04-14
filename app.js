var browserDataEl = document.getElementById("browserData");
var screenDataEl = document.getElementById("screenData");
var permissionsDataEl = document.getElementById("permissionsData");
var compatibilityDataEl = document.getElementById("compatibilityData");
var jsonOutputEl = document.getElementById("jsonOutput");
var envStatusEl = document.getElementById("envStatus");
var refreshBtn = document.getElementById("refreshBtn");
var exportBtn = document.getElementById("exportBtn");

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
    html +=
      '<dl class="kv"><dt>' +
      items[i][0] +
      "</dt><dd>" +
      toDisplay(items[i][1]) +
      "</dd></dl>";
  }

  target.innerHTML = html;
}

function supportsPermissionsApi() {
  return !!(navigator.permissions && navigator.permissions.query);
}

function supportsNetworkInfo() {
  return !!navigator.connection;
}

function isTizenRuntime() {
  return !!window.tizen || /Tizen/i.test(navigator.userAgent || "");
}

function readPermissions() {
  var results = [];
  var names = ["geolocation", "camera", "microphone", "notifications"];
  var chain = Promise.resolve();
  var i;

  if (!supportsPermissionsApi()) {
    return Promise.resolve([["Permissions API", "No disponible"]]);
  }

  for (i = 0; i < names.length; i += 1) {
    (function (name) {
      chain = chain.then(function () {
        return navigator.permissions
          .query({ name: name })
          .then(function (status) {
            results.push([name, status.state]);
          })
          .catch(function () {
            results.push([name, "No soportado"]);
          });
      });
    })(names[i]);
  }

  return chain.then(function () {
    return results;
  });
}

function collectData(permissions) {
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var screen = window.screen || {};

  return {
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookies: navigator.cookieEnabled,
      online: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory !== undefined ? navigator.deviceMemory : "No disponible",
      maxTouchPoints: navigator.maxTouchPoints,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer || "Ninguno"
    },
    screenData: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      pixelRatio: window.devicePixelRatio,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      }
    },
    permissionsData: {
      permissions: permissions,
      effectiveType: connection && connection.effectiveType ? connection.effectiveType : "No disponible",
      downlink: connection && connection.downlink !== undefined ? connection.downlink : "No disponible",
      rtt: connection && connection.rtt !== undefined ? connection.rtt : "No disponible",
      saveData: connection && connection.saveData !== undefined ? connection.saveData : "No disponible",
      type: connection && connection.type ? connection.type : "No disponible"
    },
    compatibility: {
      tizenRuntime: isTizenRuntime(),
      permissionsApi: supportsPermissionsApi(),
      networkInformationApi: supportsNetworkInfo(),
      storageEstimateApi: !!(navigator.storage && navigator.storage.estimate)
    },
    timestamp: new Date().toISOString()
  };
}

function refreshView() {
  envStatusEl.textContent = "Actualizando";

  return readPermissions().then(function (permissions) {
    var snapshot = collectData(permissions);

    renderList(browserDataEl, Object.keys(snapshot.browser).map(function (key) {
      return [key, snapshot.browser[key]];
    }));

    renderList(screenDataEl, Object.keys(snapshot.screenData).map(function (key) {
      return [key, snapshot.screenData[key]];
    }));

    renderList(permissionsDataEl, Object.keys(snapshot.permissionsData).map(function (key) {
      return [key, snapshot.permissionsData[key]];
    }));

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
window.addEventListener("resize", refreshView);
window.addEventListener("online", refreshView);
window.addEventListener("offline", refreshView);

refreshView();
