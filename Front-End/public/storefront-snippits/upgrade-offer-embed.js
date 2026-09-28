/**
 * Upgrade Offer Embed — CartBundles
 *
 * Reads pre-fetched offers from window.__CBCore (populated by master-script.js).
 * Does NOT make its own API call.
 *
 * Upgrade-specific logic kept local:
 *  - hexLuminance / contrastTextOn / mutedTextOn (color helpers for dynamic card theming)
 *  - collectFormOptions / getProductForm (reads current product form state for options)
 */
salla.onReady(() => {
  if (window.__UPGRADE_OFFER_EMBED_LOADED__) return;
  window.__UPGRADE_OFFER_EMBED_LOADED__ = true;

  if (document.getElementById("custom-upgrade-widgets-root")) return;

  let executed = false;
  function run() {
    if (executed) return;
    const core = window.__CBCore;
    if (!core || !core.isLoaded) return;
    executed = true;

    const offers = core.offers || [];
    const upgradeOffers = offers.filter((o) => o.kind === "upgrade_offer");
    if (!upgradeOffers.length) return;

    const anchor = core.getTargetAnchor();
    if (!anchor) return;

    initUpgradeWidgets(upgradeOffers, anchor, core);
  }

  if (window.__CBCore?.isLoaded) {
    run();
  } else {
    document.addEventListener("cb:core-loaded", run, { once: true });
    document.addEventListener("cb:offers-ready", run, { once: true });
  }
});

// ─── Upgrade-specific: Color Utilities ────────────────────────────────────────
function hexLuminance(hex) {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lin = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastTextOn(bg) {
  const lum = hexLuminance(bg);
  if (lum == null) return "#0f172a";
  return lum > 0.45 ? "#0f172a" : "#f8fafc";
}

function mutedTextOn(bg) {
  const lum = hexLuminance(bg);
  if (lum == null) return "#64748b";
  return lum > 0.45 ? "#475569" : "#cbd5e1";
}

// ─── Upgrade-specific: Form Option Collector ──────────────────────────────────
const OPTION_NAME_RE = /(?:product_)?options\[(\d+)\]/;

function getProductForm() {
  return (
    document.querySelector("form#product-form") ||
    document.querySelector("form.product-form") ||
    document.getElementById("product-form") ||
    document.querySelector(".product-form")
  );
}

function collectFormOptions(form) {
  const options = {};
  if (!form) return options;
  const assign = (optionId, value) => {
    if (value === undefined || value === null || value === "") return;
    if (Object.prototype.hasOwnProperty.call(options, optionId)) {
      const prev = options[optionId];
      options[optionId] = Array.isArray(prev) ? prev.concat(value) : [prev, value];
    } else {
      options[optionId] = value;
    }
  };
  if (typeof FormData === "function") {
    new FormData(form).forEach((value, key) => {
      const match = key.match(OPTION_NAME_RE);
      if (match) assign(match[1], value);
    });
  }
  form
    .querySelectorAll(
      "[name^='options['], [name^='product_options['], salla-product-options input, salla-product-options select"
    )
    .forEach((el) => {
      const name = el.getAttribute("name") || "";
      const match = name.match(OPTION_NAME_RE);
      if (!match) return;
      if (el.type === "radio" || el.type === "checkbox") {
        if (el.checked) assign(match[1], el.value);
      } else if (!el.disabled) {
        assign(match[1], el.value);
      }
    });
  return options;
}

// ─── Widget Builder ───────────────────────────────────────────────────────────
async function initUpgradeWidgets(upgradeOffers, anchor, core) {
  const { isAr, escapeHTML, formatPrice, resolveCartAdder, merchantId, productId } = core;

  const root = document.createElement("div");
  root.id = "custom-upgrade-widgets-root";

  for (let i = 0; i < upgradeOffers.length; i++) {
    try {
      const widget = await buildUpgradeWidget(upgradeOffers[i], i, { isAr, escapeHTML, formatPrice, resolveCartAdder, merchantId, productId });
      if (widget) {
        root.appendChild(widget);
        if (window.__CART_BUNDLES_TRACK__ && upgradeOffers[i]?.id) {
          window.__CART_BUNDLES_TRACK__({
            merchantId: Number(merchantId),
            offerId: Number(upgradeOffers[i].id),
            event: "offer.impression",
            productId: Number(productId),
            source: "upgrade",
          });
        }
      }
    } catch (err) {
      console.warn("[UpgradeOffer] Failed to build widget:", upgradeOffers[i]?.id, err);
    }
  }

  if (root.hasChildNodes()) {
    anchor.insertAdjacentElement("beforebegin", root);
  }
}

async function buildUpgradeWidget(offer, index, { isAr, escapeHTML, formatPrice, resolveCartAdder, merchantId, productId }) {
  const settings = offer.upgradeSettings || {};
  const upgradeId = settings.upgradeSallaProductId;
  if (!upgradeId) return null;

  const title = offer.title?.[isAr ? "ar" : "en"] || offer.title?.ar || "";
  const subtitle = offer.subtitle?.[isAr ? "ar" : "en"] || offer.subtitle?.ar || "";
  const couponCode = (settings.couponCode || "").trim();
  const redirectToCart = Boolean(offer.redirectToCartAfterAdd);

  const results = await Promise.allSettled([salla.product.getDetails(upgradeId, ["options"])]);

  function mapProduct(d, fallbackId) {
    if (!d) return { id: fallbackId, name: "", price: 0, image: "", url: "", options: [] };
    let img = d.main_image || d.image || d.thumbnail || (d.images && d.images[0]?.url);
    if (typeof img === "object" && img !== null) img = img.url;
    return {
      id: d.id,
      name: d.name || "",
      price: parseFloat(d.price?.amount ?? d.price ?? 0),
      image: img || "",
      url: d.url || d.urls?.customer || "",
      options: Array.isArray(d.options) ? d.options : [],
    };
  }

  const upgradeData = mapProduct(
    results[0].status === "fulfilled" ? results[0].value?.data : null,
    upgradeId
  );
  if (!upgradeData.name && !upgradeData.price) return null;

  const colors = offer.appearance?.colors || {};
  const radius = offer.appearance?.borderRadiusPx ?? 12;
  const cardBg = colors.cardBg || "#ffffff";
  const cardBorder = colors.cardBorder || "#e2e8f0";
  const badgeBg = colors.badgeBg || "#004d5b";
  const badgeText = colors.badgeText || "#ffffff";
  const titleColor = colors.titleColor || contrastTextOn(cardBg);
  const bodyText = contrastTextOn(cardBg);
  const mutedText = mutedTextOn(cardBg);
  const core = window.__CBCore;
  const align = (core && core.headingAlign && core.headingAlign(offer.appearance)) || "start";
  const cardCss =
    (core && core.appearanceCardCss && core.appearanceCardCss(offer.appearance, `margin: 2rem 0; padding: 18px; color: ${bodyText};`)) ||
    `margin: 2rem 0; padding: 18px; border-radius: ${radius}px; background-color: ${cardBg}; border: 1px solid ${cardBorder}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); font-family: inherit; color: ${bodyText};`;

  const card = document.createElement("div");
  card.className = "custom-upgrade-widget";
  card.dataset.offerId = offer.id ?? index;
  card.setAttribute("dir", isAr ? "rtl" : "ltr");
  card.style.cssText = cardCss;

  card.innerHTML = `
    <div style="margin-bottom: 14px; text-align: ${align};">
      <h3 style="font-size: 1.15rem; font-weight: 700; color: ${titleColor}; margin: 0 0 4px 0;">
        ${escapeHTML(title || (isAr ? "عرض ترقية مميز ✨" : "Special Upgrade Offer ✨"))}
      </h3>
      ${subtitle ? `<p style="font-size: 0.85rem; color: ${mutedText}; margin: 0;">${escapeHTML(subtitle)}</p>` : ""}
    </div>

    <a href="${escapeHTML(upgradeData.url || "#")}" class="upgrade-product-link" style="text-decoration: none; color: inherit; display: block; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 12px; border: 1.5px solid ${badgeBg}; border-radius: ${radius}px; padding: 10px; background: ${colors.selectedTier || "#f0fdf4"}; overflow: hidden; position: relative;">
        <div style="position: relative; height: 80px; aspect-ratio: 3/4; flex-shrink: 0; overflow: hidden; border-radius: ${radius}px; background: #f1f5f9; border: 1px solid ${cardBorder};">
          ${upgradeData.image ? `<img src="${escapeHTML(upgradeData.image)}" alt="${escapeHTML(upgradeData.name)}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="display: flex; height: 100%; align-items: center; justify-content: center; font-size: 8px; color: ${mutedText};">...</div>`}
        </div>
        <div style="min-width: 0; flex: 1;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: ${badgeBg}; color: ${badgeText}; margin-bottom: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            ${isAr ? "✨ ترقية" : "✨ Upgrade"}
          </span>
          <div style="font-size: 0.85rem; font-weight: 700; color: ${bodyText}; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.2;" title="${escapeHTML(upgradeData.name)}">
            ${escapeHTML(upgradeData.name)}
          </div>
          <div style="font-size: 0.95rem; font-weight: 800; color: ${titleColor};">
            ${formatPrice(upgradeData.price)}
          </div>
        </div>
      </div>
    </a>

    ${couponCode ? `<p style="margin: 0 0 12px 0; padding: 8px 12px; border-radius: ${radius}px; background: ${colors.selectedTier || "#f0fdf4"}; font-size: 0.8rem; font-weight: 500; text-align: center; color: ${bodyText};">${isAr ? "استخدم الكود" : "Use code"} <strong>${escapeHTML(couponCode)}</strong></p>` : ""}
    <button type="button" class="upgrade-add-btn" style="width: 100%; padding: 10px 20px; border: none; border-radius: ${radius}px; background: ${badgeBg}; color: ${badgeText}; font-size: 0.9rem; font-weight: 700; cursor: pointer;">
      ${isAr ? "الترقية الآن" : "Upgrade now"}
    </button>
  `;

  // Track clicks on upgrade product card link
  const productLink = card.querySelector(".upgrade-product-link");
  if (productLink) {
    productLink.addEventListener("click", () => {
      if (window.__CART_BUNDLES_TRACK__ && offer.id) {
        window.__CART_BUNDLES_TRACK__({
          merchantId: Number(merchantId),
          offerId: Number(offer.id),
          event: "offer.click",
          productId: Number(upgradeData.id || productId),
          source: "upgrade",
        });
      }
    });
  }

  const btn = card.querySelector(".upgrade-add-btn");
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.style.opacity = "0.7";
    try {
      if (window.__CART_BUNDLES_TRACK__ && offer.id) {
        window.__CART_BUNDLES_TRACK__({
          merchantId: Number(merchantId),
          offerId: Number(offer.id),
          event: "offer.click",
          productId: Number(productId),
          source: "upgrade",
        });
      }
      const add = resolveCartAdder();
      if (!add) throw new Error("salla.cart.addItem unavailable");

      // Build payload with auto-selected required options
      const payload = { id: upgradeData.id, quantity: 1 };
      const opts = upgradeData.options || [];
      if (opts.length) {
        const selectedOptions = {};
        for (const opt of opts) {
          if (!opt.required) continue;
          const firstAvail = (opt.details || []).find((d) => !d.is_out);
          if (firstAvail) selectedOptions[opt.id] = firstAvail.id;
        }
        if (Object.keys(selectedOptions).length) payload.options = selectedOptions;
      }

      await add(payload);

      if (couponCode) {
        try {
          if (typeof salla?.cart?.applyCoupon === "function") {
            await salla.cart.applyCoupon(couponCode);
          } else if (salla?.cart?.api && typeof salla.cart.api.addCoupon === "function") {
            await salla.cart.api.addCoupon({ coupon: couponCode });
          }
        } catch (couponErr) {
          console.warn("[UpgradeOffer] Could not auto-apply coupon:", couponErr);
        }
      }

      if (window.__CART_BUNDLES_TRACK__ && offer.id) {
        window.__CART_BUNDLES_TRACK__({
          merchantId: Number(merchantId),
          offerId: Number(offer.id),
          event: "offer.add_to_cart",
          productId: Number(upgradeData.id),
          source: "upgrade",
        });
      }
      if (salla.notify) salla.notify.success(isAr ? "تمت إضافة منتج الترقية للسلة" : "Upgrade product added to cart");
      if (redirectToCart) {
        window.location.href = (salla.url && salla.url.get("cart")) || "/cart";
      }
    } catch (err) {
      console.error("[UpgradeOffer] Error adding upgrade:", err);
      if (salla.notify) salla.notify.error(isAr ? "فشل إضافة منتج الترقية" : "Failed to add upgrade product");
    } finally {
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  });

  return card;
}
