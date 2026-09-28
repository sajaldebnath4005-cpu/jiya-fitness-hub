// Packaged-food barcode lookup and recent checks.
import { supabase } from "./supabase.js";
import { byId, requireLogin, renderNavigation, toast, round } from "./main.js";

renderNavigation();

let user = null;
let scanControls = null;
let scanStarting = false;
let scanSession = 0;
let readerPromise = null;

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  const { data: fitness } = await supabase
    .from("user_profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!fitness || !fitness.onboarding_completed_at) {
    window.location.replace("onboarding.html");
    return;
  }

  await loadScans();
  byId("searchButton").addEventListener("click", search);
  byId("scanButton").addEventListener("click", openScanner);
  byId("closeScanner").addEventListener("click", () => closeScanner());
  byId("barcodeInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") search();
  });
}

// Load the locally packaged ZXing reader on demand. It reads printed EAN/UPC
// codes on both webcam and phone cameras, including browsers without BarcodeDetector.
function loadReader() {
  if (!readerPromise) {
    readerPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "js/vendor/zxing-browser.min.js";
      script.onload = () =>
        window.ZXingBrowser
          ? resolve(window.ZXingBrowser)
          : reject(new Error("Barcode reader unavailable"));
      script.onerror = () => reject(new Error("Barcode reader could not load"));
      document.head.appendChild(script);
    }).catch((error) => {
      readerPromise = null;
      throw error;
    });
  }
  return readerPromise;
}

async function openScanner() {
  if (scanStarting || scanControls) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    byId("cameraStatus").textContent =
      "Camera access needs a secure (https) page and a supported browser. Enter the barcode manually instead.";
    return;
  }

  scanStarting = true;
  const session = ++scanSession;
  byId("scanButton").disabled = true;
  byId("scannerWrap").classList.remove("hidden");
  byId("cameraStatus").textContent = "Starting camera and barcode reader…";
  try {
    const ZXing = await loadReader();
    if (session !== scanSession) return;
    const reader = new ZXing.BrowserMultiFormatOneDReader(undefined, {
      delayBetweenScanAttempts: 180,
      delayBetweenScanSuccess: 500,
    });
    // ZXing owns the camera stream and its continuous decode loop.
    const controls = await reader.decodeFromConstraints(
      {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      byId("scannerVideo"),
      (result) => {
        if (session !== scanSession || !result) return;
        const barcode = result.getText().replace(/\D/g, "");
        if (!/^\d{8,14}$/.test(barcode)) return;
        byId("barcodeInput").value = barcode;
        closeScanner(true);
        byId("cameraStatus").textContent = "Barcode captured: " + barcode + ". Looking up product…";
        search();
      },
    );
    if (session !== scanSession) {
      controls.stop();
      return;
    }
    scanControls = controls;
    scanStarting = false;
    byId("cameraStatus").textContent =
      "Scanning… Hold the barcode steady and fill the camera view with it.";
  } catch (error) {
    console.error(error);
    byId("cameraStatus").textContent =
      error && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
        ? "Camera permission was denied. Allow camera access in your browser settings, or enter the barcode manually."
        : error && error.name === "NotFoundError"
          ? "No camera was found. Enter the barcode manually."
          : "The camera or barcode reader could not start. Enter the barcode manually.";
    closeScanner(true);
  }
}

function closeScanner(keepStatus) {
  scanSession++;
  if (scanControls) scanControls.stop();
  scanControls = null;
  scanStarting = false;
  const video = byId("scannerVideo");
  if (video.srcObject) video.srcObject.getTracks().forEach((track) => track.stop());
  video.srcObject = null;
  byId("scannerWrap").classList.add("hidden");
  byId("scanButton").disabled = false;
  if (!keepStatus) byId("cameraStatus").textContent = "";
}

window.addEventListener("pagehide", () => closeScanner(true));

async function search() {
  const barcode = byId("barcodeInput").value.replace(/\D/g, "");
  if (barcode.length < 8) {
    toast("A barcode has at least 8 digits.", "error");
    return;
  }

  byId("searchStatus").textContent = "Searching for " + barcode + "...";
  try {
    const response = await fetch(
      "https://world.openfoodfacts.org/api/v2/product/" + barcode + ".json",
    );
    const result = await response.json();
    if (!result || result.status !== 1 || !result.product) {
      byId("searchStatus").textContent = "No product found for this barcode.";
      byId("resultCard").classList.add("hidden");
      return;
    }
    byId("searchStatus").textContent = "";
    const saved = await saveScan(barcode, result.product);
    showProduct(saved);
    await loadScans();
  } catch (error) {
    console.error(error);
    byId("searchStatus").textContent = "The food database did not answer. Try again.";
  }
}

async function saveScan(barcode, product) {
  const nutriments = product.nutriments || {};
  const row = {
    user_id: user.id,
    source: "barcode",
    barcode,
    food_name: product.product_name || "Unknown food",
    brand: product.brands || null,
    image_url: product.image_url || null,
    grade: product.nutriscore_grade || null,
    serving_size: product.serving_size || null,
    calories: nutriments["energy-kcal_100g"] || null,
    macros: {
      protein_g: nutriments.proteins_100g || 0,
      carbs_g: nutriments.carbohydrates_100g || 0,
      fat_g: nutriments.fat_100g || 0,
      sugar_g: nutriments.sugars_100g || 0,
      fiber_g: nutriments.fiber_100g || 0,
      salt_g: nutriments.salt_100g || 0,
    },
    nutrients_per_100g: nutriments,
    ingredients: product.ingredients_text || null,
    allergens: product.allergens_tags || [],
    summary: buildSummary(product, nutriments),
  };

  const { data, error } = await supabase.from("nutrition_scans").insert(row).select().maybeSingle();
  if (error) {
    console.error(error);
    toast("Found the food but could not save it.", "error");
    return row;
  }
  return data || row;
}

function buildSummary(product, nutriments) {
  const parts = [];
  const grade = (product.nutriscore_grade || "").toUpperCase();
  if (grade && grade !== "NOT-APPLICABLE") parts.push("Nutri-Score " + grade + ".");
  if (nutriments.sugars_100g > 15) parts.push("High in sugar.");
  if (nutriments.salt_100g > 1.5) parts.push("High in salt.");
  if (nutriments.proteins_100g > 15) parts.push("Good source of protein.");
  if (parts.length === 0) parts.push("Nothing unusual in this product.");
  return parts.join(" ");
}

function gradeClass(grade) {
  const letter = (grade || "").toLowerCase();
  return ["a", "b", "c", "d", "e"].includes(letter) ? "grade-" + letter : "grade-unknown";
}

// Escape external food data before inserting it into HTML.
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function showProduct(scan) {
  const macros = scan.macros || {};
  const card = byId("resultCard");
  card.classList.remove("hidden");
  card.innerHTML =
    '<div class="row" style="align-items:flex-start;gap:14px">' +
    (scan.image_url && /^https:\/\//.test(scan.image_url)
      ? '<img src="' +
        escapeHtml(scan.image_url) +
        '" alt="" style="width:80px;border-radius:12px" />'
      : "") +
    "<div style='flex:1'><h2 style='margin:0'>" +
    escapeHtml(scan.food_name) +
    "</h2>" +
    '<p class="small muted" style="margin:4px 0 0">' +
    escapeHtml(scan.brand || "No brand") +
    " · barcode " +
    escapeHtml(scan.barcode) +
    "</p></div>" +
    '<div class="grade ' +
    gradeClass(scan.grade) +
    '">' +
    escapeHtml(scan.grade || "?") +
    "</div></div>" +
    '<div class="info-grid">' +
    '<div class="info-box"><p class="stat-label">Calories /100g</p><b>' +
    (scan.calories ? round(scan.calories) : "-") +
    "</b></div>" +
    '<div class="info-box"><p class="stat-label">Protein</p><b>' +
    round(macros.protein_g) +
    " g</b></div>" +
    '<div class="info-box"><p class="stat-label">Carbs</p><b>' +
    round(macros.carbs_g) +
    " g</b></div>" +
    '<div class="info-box"><p class="stat-label">Fat</p><b>' +
    round(macros.fat_g) +
    " g</b></div></div>" +
    '<p class="small">' +
    escapeHtml(scan.summary || "") +
    "</p>" +
    (scan.serving_size
      ? '<p class="small muted">Serving size: ' + escapeHtml(scan.serving_size) + "</p>"
      : "") +
    ((scan.allergens || []).length > 0
      ? '<p class="small muted">Allergens: ' +
        escapeHtml(scan.allergens.map((item) => item.replace("en:", "")).join(", ")) +
        "</p>"
      : "") +
    (scan.ingredients
      ? "<div><h3>Ingredients</h3><p class='small muted'>" +
        escapeHtml(scan.ingredients) +
        "</p></div>"
      : "");
}

async function loadScans() {
  const { data } = await supabase
    .from("nutrition_scans")
    .select("*")
    .eq("user_id", user.id)
    .order("scanned_at", { ascending: false });
  const rows = data || [];
  const box = byId("scanList");
  if (rows.length === 0) {
    box.innerHTML = '<p class="muted small">No foods checked yet.</p>';
    return;
  }
  box.innerHTML = "";
  rows.forEach(function (scan) {
    const row = document.createElement("div");
    row.className = "list-row";
    row.style.cursor = "pointer";
    row.innerHTML =
      "<span>" +
      escapeHtml(scan.food_name) +
      '<br><span class="small muted">' +
      escapeHtml(scan.brand || "") +
      '</span></span><span class="grade ' +
      gradeClass(scan.grade) +
      '">' +
      escapeHtml(scan.grade || "?") +
      "</span>";
    row.addEventListener("click", function () {
      showProduct(scan);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    box.appendChild(row);
  });
}
