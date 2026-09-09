/**
 * CartBundles Master Script
 *
 * Responsibilities:
 *  1. Expose window.__CBCore with shared utilities (language, currency, cart helpers)
 *  2. Fetch the storefront offers API ONCE for the product page
 *  3. Dispatch "cb:offers-ready" so each offer handler can react without their own fetch
 *  4. Register the addon cart::item-added sync listener ONCE (not per-offer-script)
 *  5. Load each offer embed script via fetchSnippit()
 * 
 * This script was slightly remodularized with AI after rapid dev and testing for scripts per individual offer type
 */

// ─── Script Loader (dev helper — cache-busted for easy iteration) ──────────────
function fetchSnippit(scriptUrl) {
  if (!scriptUrl) {
    console.warn("[CartBundles] fetchSnippit called without a scriptURL");
    return;
  }
  const existing = document.getElementById(scriptUrl);
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.id = scriptUrl;
  script.src = `${scriptUrl}?t=${Date.now()}`;
  script.defer = true;
  script.onload = () => console.log(`[CartBundles] ✅ Loaded: ${scriptUrl}`);
  script.onerror = () => console.error(`[CartBundles] ❌ Failed to load: ${scriptUrl}`);
  document.body.appendChild(script);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
salla.onReady(async () => {
  if (window.__CART_BUNDLES_MASTER_LOADED__) return;
  window.__CART_BUNDLES_MASTER_LOADED__ = true;

  // ── 1. Shared config ────────────────────────────────────────────────────────
  const langConfig = salla.config.get("user.language");
  const isAr = langConfig ? langConfig.startsWith("ar") : true;
  const currency = salla.config.get("store.currency") || (isAr ? "ر.س" : "SAR");
  const merchantId = salla.config.get("store.id");
  const productId = salla.config.get("page.id");
  const API_BASE = "https://backend-dev.cartbundles.com/api/v1";

  // ── 2. Shared utilities ─────────────────────────────────────────────────────
  const escapeHTML = (str) =>
    str
      ? String(str).replace(
          /[&<>'"]/g,
          (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[t])
        )
      : "";

  const formatPrice = (price) =>
    `<bdi>${(parseFloat(price) || 0).toFixed(2)} ${currency}</bdi>`;

  function getTargetAnchor() {
    return (
      document.querySelector("form#product-form") ||
      document.getElementById("product-form") ||
      document.querySelector(".product-form") ||
      document.getElementById("single-product-form") ||
      document.querySelector(".form.form--product-options") ||
      document.querySelector("div.option-wrapper") ||
      document.querySelector("div.product-option-wrapper") ||
      document.querySelector("div.options")
    );
  }

  function resolveCartAdder() {
    if (!salla.cart) return null;
    if (typeof salla.cart.addItem === "function") return (p) => salla.cart.addItem(p);
    if (salla.cart.api && typeof salla.cart.api.addItem === "function") return (p) => salla.cart.api.addItem(p);
    return null;
  }

  /**
   * Canonical add-to-cart helper: auto-selects first available required option.
   * @param {object} product  - must have { id, options[] }
   * @param {number} quantity
   */
  async function addItemWithDefaultOptions(product, quantity) {
    const add = resolveCartAdder();
    if (!add) throw new Error("[CartBundles] salla.cart.addItem unavailable");

    const payload = { id: product.id, quantity: quantity || 1 };
    const opts = Array.isArray(product.options) ? product.options : [];

    if (opts.length) {
      const selectedOptions = {};
      for (const opt of opts) {
        if (!opt.required) continue;
        const firstAvail = (opt.details || []).find((d) => !d.is_out);
        if (firstAvail) selectedOptions[opt.id] = firstAvail.id;
      }
      if (Object.keys(selectedOptions).length) payload.options = selectedOptions;
    }
    return add(payload);
  }

  // ── 3. Publish core ─────────────────────────────────────────────────────────
  window.__CBCore = {
    isAr,
    currency,
    API_BASE,
    merchantId,
    productId,
    escapeHTML,
    formatPrice,
    getTargetAnchor,
    resolveCartAdder,
    addItemWithDefaultOptions,
    offers: null, // will be populated below
    isLoaded: false,
  };

  // ── 4. Fetch storefront offers (product-page scripts share this one call) ───
  const pageSlug = salla.config.get("page.slug");
  const isProductPage = pageSlug === "product.single" || Boolean(productId);

  if (isProductPage && merchantId) {
    try {
      let categoryIds = [];
      if (productId && salla?.product?.getDetails) {
        try {
          const response = await salla.product.getDetails(productId, ["category"]);
          const catData = response.data?.category || response.data?.categories;
          if (catData) {
            categoryIds = Array.isArray(catData)
              ? catData.map((c) => c.id).filter(Boolean)
              : catData.id
              ? [catData.id]
              : [];
          }
        } catch (_) {
          console.warn("[CartBundles] Failed to fetch category details, continuing without.");
        }
      }

      const urlParams = new URLSearchParams();
      if (productId) urlParams.append("productId", productId);
      if (categoryIds.length) urlParams.append("categoryIds", categoryIds.join(","));

      const res = await fetch(`${API_BASE}/offers/storefront/${merchantId}?${urlParams}`);
      if (res.ok) {
        const offers = await res.json();
        window.__CBCore.offers = Array.isArray(offers) ? offers : [];
      } else {
        throw new Error(`[CartBundles] Failed response ${res.status} while fetching storefront offers. Error:${res}`);
      }
    } catch (err) {
      console.error("[CartBundles] Failed to fetch storefront offers:", err);
      window.__CBCore.offers = [];
    }
  } else {
    window.__CBCore.offers = [];
  }

  window.__CBCore.isLoaded = true;

  // ── 5. Notify offer handlers that core & data are ready ─────────────────────
  document.dispatchEvent(new CustomEvent("cb:core-loaded"));
  document.dispatchEvent(new CustomEvent("cb:offers-ready"));

  // ── 6. Addon cart::item-added sync — registered ONCE here, not in addon script
  //       Syncs pre-checked addon checkboxes when the main product is added to cart.
  salla.event.on("cart::item-added", async (res) => {
    const mainProductId = salla.config.get("page.id");
    const addedProductId = res.data?.product_id;
    if (String(addedProductId) !== String(mainProductId)) return;

    const checkedBoxes = document.querySelectorAll(".salla-addon-cb:checked");
    for (const cb of checkedBoxes) {
      try {
        const pRes = await salla.product.getDetails(cb.value, ["options"]);
        const opts = pRes?.data?.options || [];
        const payload = { id: cb.value, quantity: 1 };
        const selectedOptions = {};
        for (const opt of opts) {
          if (!opt.required) continue;
          const firstAvail = (opt.details || []).find((d) => !d.is_out);
          if (firstAvail) selectedOptions[opt.id] = firstAvail.id;
        }
        if (Object.keys(selectedOptions).length) payload.options = selectedOptions;

        const add = resolveCartAdder();
        if (add) await add(payload);
      } catch (e) {
        console.warn("[CartBundles] Failed to auto-add checked addon:", cb.value, e);
      }
    }
  });
});

// ─── Load offer scripts ────────────────────────────────────────────────────────
const BASE_URL = "https://frontend-dev.cartbundles.com/storefront-snippits/";
const SCRIPTS = [
  "addon-offer-embed.js",
  "quantity-offer-embed.js",
  "bundle-offer-embed.js",
  "upgrade-offer-embed.js",
  "recommendation-offer-embed.js",
];

SCRIPTS.forEach((name) => fetchSnippit(BASE_URL + name));