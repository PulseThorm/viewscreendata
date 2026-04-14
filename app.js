const browserDataEl = document.getElementById("browserData");
const screenDataEl = document.getElementById("screenData");
const permissionsDataEl = document.getElementById("permissionsData");
const shareDataEl = document.getElementById("shareData");
const jsonOutputEl = document.getElementById("jsonOutput");
const previewEl = document.getElementById("preview");
const shareStateEl = document.getElementById("shareState");
const envStatusEl = document.getElementById("envStatus");

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const shareBtn = document.getElementById("shareBtn");
const stopShareBtn = document.getElementById("stopShareBtn");

let sharedStream = null;

function toDisplay(value) {
  if (value === null || value === undefined) {
    return "N/D";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    const hasNested = value.some((item) => typeof item === "object");
    return hasNested ? JSON.stringify(value) : value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function renderList(target, items) {
  target.innerHTML = items
    .map(
      ([label, value]) => `
        <dl class="kv">
          <dt>${label}</dt>
          <dd>${toDisplay(value)}</dd>
        </dl>
      `,
    )
    .join("");
}

async function readPermissions() {
  const results = [];
  const names = ["geolocation", "camera", "microphone", "clipboard-read", "notifications"];

  if (!navigator.permissions?.query) {
    return [["Permissions API", "No disponible"]];
  }

  for (const name of names) {
    try {
      const status = await navigator.permissions.query({ name });
      results.push([name, status.state]);
    } catch {
      results.push([name, "No soportado"]);
    }
  }

  return results;
}

function collectData(extraShare = null) {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const screen = window.screen || {};
  const viewport = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };

  const browser = {
    userAgent: navigator.userAgent,
    userAgentData: navigator.userAgentData
      ? {
          brands: navigator.userAgentData.brands,
          mobile: navigator.userAgentData.mobile,
          platform: navigator.userAgentData.platform,
        }
      : "No disponible",
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory ?? "No disponible",
    maxTouchPoints: navigator.maxTouchPoints,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || "Ninguno",
    doNotTrack: navigator.doNotTrack ?? "N/D",
    storageEstimate: navigator.storage?.estimate ? "Disponible" : "No disponible",
  };

  const screenData = {
    screenWidth: screen.width,
    screenHeight: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    devicePixelRatio: window.devicePixelRatio,
    orientation: screen.orientation?.type ?? "No disponible",
    viewport,
  };

  const connectionData = {
    effectiveType: connection?.effectiveType ?? "No disponible",
    downlink: connection?.downlink ?? "No disponible",
    rtt: connection?.rtt ?? "No disponible",
    saveData: connection?.saveData ?? "No disponible",
    permissions: [],
  };

  return {
    browser,
    screenData,
    connectionData,
    extraShare,
    timestamp: new Date().toISOString(),
  };
}

async function refreshView() {
  envStatusEl.textContent = "Actualizando";

  const permissions = await readPermissions();
  const snapshot = collectData(sharedStream ? buildShareInfo(sharedStream) : null);
  snapshot.connectionData.permissions = permissions;

  renderList(
    browserDataEl,
    Object.entries(snapshot.browser).map(([key, value]) => [key, value]),
  );
  renderList(
    screenDataEl,
    Object.entries(snapshot.screenData).map(([key, value]) => [key, value]),
  );
  renderList(
    permissionsDataEl,
    Object.entries(snapshot.connectionData).map(([key, value]) => [key, value]),
  );

  if (snapshot.extraShare) {
    renderList(
      shareDataEl,
      Object.entries(snapshot.extraShare).map(([key, value]) => [key, value]),
    );
  } else {
    shareDataEl.innerHTML = `
      <dl class="kv">
        <dt>Estado</dt>
        <dd>Sin pantalla compartida activa</dd>
      </dl>
    `;
  }

  jsonOutputEl.textContent = JSON.stringify(snapshot, null, 2);
  envStatusEl.textContent = "Listo";
}

function buildShareInfo(stream) {
  const [track] = stream.getVideoTracks();
  const settings = track?.getSettings?.() || {};
  const capabilities = track?.getCapabilities?.() || {};

  return {
    active: stream.active,
    trackLabel: track?.label ?? "N/D",
    trackState: track?.readyState ?? "N/D",
    settings,
    capabilities,
  };
}

async function startShare() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    alert("Tu navegador no soporta getDisplayMedia.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    sharedStream = stream;
    previewEl.srcObject = stream;
    shareBtn.disabled = true;
    stopShareBtn.disabled = false;
    shareStateEl.textContent = "Compartiendo";
    shareStateEl.classList.remove("muted");

    const track = stream.getVideoTracks()[0];
    track?.addEventListener("ended", stopShare);

    await refreshView();
  } catch (error) {
    console.warn(error);
    alert("No se pudo iniciar la comparticion de pantalla.");
  }
}

function stopShare() {
  if (!sharedStream) {
    return;
  }

  const stream = sharedStream;
  sharedStream = null;
  for (const track of stream.getTracks()) {
    track.stop();
  }
  previewEl.srcObject = null;
  shareBtn.disabled = false;
  stopShareBtn.disabled = true;
  shareStateEl.textContent = "Sin captura";
  shareStateEl.classList.add("muted");
  shareDataEl.innerHTML = `
    <dl class="kv">
      <dt>Estado</dt>
      <dd>Sin pantalla compartida activa</dd>
    </dl>
  `;
  refreshView();
}

function downloadJSON() {
  const payload = jsonOutputEl.textContent || "{}";
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
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

refreshView();
