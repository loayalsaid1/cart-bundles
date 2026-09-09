/**
 * Quantity Offer Embed — CartBundles
 *
 * Reads pre-fetched offers from window.__CBCore (populated by master-script.js).
 * Renders a tier selection UI that drives Salla's native quantity input.
 * Does NOT make its own API call.
 */
salla.onReady(() => {
  if (window.__QUANTITY_OFFER_EMBED_LOADED__) return;
  window.__QUANTITY_OFFER_EMBED_LOADED__ = true;

  let executed = false;
  function run() {
    if (executed) return;
    const core = window.__CBCore;
    if (!core || !core.isLoaded) return;
    executed = true;

    const offers = core.offers || [];
    const quantityOffer = offers.find((o) => o.kind === "quantity_discount");
    if (!quantityOffer) return;

    const anchor = core.getTargetAnchor();
    if (!anchor) {
      console.warn("[QuantityOffer] Target product form anchor not found.");
      return;
    }

    const cardEl = renderQuantityOfferCard(quantityOffer, core);
    if (cardEl) {
      anchor.insertAdjacentElement("beforebegin", cardEl);
      if (window.__CART_BUNDLES_TRACK__ && quantityOffer.id) {
        window.__CART_BUNDLES_TRACK__({
          merchantId: Number(core.merchantId),
          offerId: Number(quantityOffer.id),
          event: "offer.impression",
          productId: Number(core.productId),
          source: "quantity",
        });
      }
    }
  }

  if (window.__CBCore?.isLoaded) {
    run();
  } else {
    document.addEventListener("cb:core-loaded", run, { once: true });
    document.addEventListener("cb:offers-ready", run, { once: true });
  }
});

// ─── Unit Price Detection (runtime DOM scraping — must stay local) ─────────────
function getUnitPrice() {
  if (typeof salla !== "undefined" && salla.product && salla.product.price) {
    const price = parseFloat(salla.product.price);
    if (!isNaN(price) && price > 0) return price;
  }
  const priceEl =
    document.querySelector(".product-price") ||
    document.querySelector("[data-product-price]") ||
    document.querySelector("salla-installment");
  if (priceEl) {
    const priceAttr = priceEl.getAttribute("price");
    if (priceAttr) {
      const parsed = parseFloat(priceAttr);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const text = priceEl.textContent || "";
    const match = text.match(/[\d,.]+/);
    if (match) {
      const parsed = parseFloat(match[0].replace(/,/g, ""));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 100; // fallback
}

function setSallaQuantity(quantity) {
  const qtyInput = document.querySelector('input[name="quantity"]');
  if (qtyInput) {
    qtyInput.value = quantity;
    qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
    qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const sallaQty = document.querySelector("salla-quantity-input");
  if (sallaQty) {
    sallaQty.setAttribute("value", quantity);
    if ("value" in sallaQty) sallaQty.value = quantity;
  }
}

function calculateTierTotal(unitPrice, quantity, pricingType, discountAmount, round) {
  const qty = quantity > 0 ? quantity : 1;
  let singlePrice = unitPrice;
  if (pricingType === "percentage") {
    singlePrice = unitPrice * (1 - (discountAmount || 0) / 100);
  } else if (pricingType === "fixed") {
    singlePrice = Math.max(0, unitPrice - (discountAmount || 0));
  }
  let total = singlePrice * qty;
  if (round) total = Math.round(total);
  return total;
}

// ─── Widget Renderer ──────────────────────────────────────────────────────────
function renderQuantityOfferCard(offer, core) {
  const { isAr, escapeHTML, merchantId, productId } = core;
  const lang = isAr ? "ar" : "en";
  const unitPrice = getUnitPrice();

  const title = offer.title?.[lang] || offer.title?.ar || "";
  const subtitle = offer.subtitle?.[lang] || offer.subtitle?.ar || "";
  const tiers = (offer.quantityTiers || []).sort((a, b) => (a.position || 0) - (b.position || 0));
  if (!tiers.length) return null;

  const colors = offer.appearance?.colors || {};
  const radius = offer.appearance?.borderRadiusPx ?? 12;
  const settings = offer.quantitySettings || {};

  const cardContainer = document.createElement("div");
  cardContainer.className = "salla-quantity-offer-card";
  if (offer.id) cardContainer.dataset.offerId = String(offer.id);
  cardContainer.setAttribute("dir", isAr ? "rtl" : "ltr");
  cardContainer.style.cssText = `
    margin: 16px 0;
    padding: 16px;
    border-radius: ${radius}px;
    background-color: ${colors.cardBg || "#ffffff"};
    border: 1px solid ${colors.cardBorder || "#e2e8f0"};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    font-family: inherit;
  `;

  let html = "";
  if (title) html += `<div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">${escapeHTML(title)}</div>`;
  if (subtitle) html += `<div style="font-size: 13px; color: #64748b; margin-bottom: 12px;">${escapeHTML(subtitle)}</div>`;
  html += `<div class="offer-tiers-list" style="display: flex; flex-direction: column; gap: 8px;"></div>`;
  cardContainer.innerHTML = html;

  const tiersListEl = cardContainer.querySelector(".offer-tiers-list");

  let selectedIndex = tiers.findIndex((t) => t.isSelectedByDefault);
  if (selectedIndex === -1) selectedIndex = 0;

  tiers.forEach((tier, index) => {
    const isSelected = index === selectedIndex;
    const total = calculateTierTotal(unitPrice, tier.quantity, tier.pricingType, tier.discountAmount, settings.roundPriceToNearestInteger);
    const originalTotal = unitPrice * tier.quantity;
    const savings = Math.max(0, originalTotal - total);
    const tierTitle = tier.mainTitle?.[lang] || tier.mainTitle?.ar || `${tier.quantity} x`;
    const badgeText = tier.badgeText || "";
    const pricePerPiece = settings.showPricePerPiece ? (total / tier.quantity).toFixed(2) : null;

    const tierItem = document.createElement("div");
    tierItem.className = `tier-item ${isSelected ? "selected" : ""}`;
    tierItem.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: ${radius}px;
      border: 1.5px solid ${isSelected ? colors.badgeBg || "#004b40" : colors.cardBorder || "#e2e8f0"};
      background-color: ${isSelected ? colors.selectedTier || "#f0fdf4" : "transparent"};
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    tierItem.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="radio" name="quantity_offer_tier" ${isSelected ? "checked" : ""} style="accent-color: ${colors.badgeBg || "#004b40"}; cursor: pointer;" />
        <div>
          <span style="font-size: 13px; font-weight: 600; color: #0f172a;">${escapeHTML(tierTitle)}</span>
          ${pricePerPiece ? `<div style="font-size: 11px; color: #64748b;">${pricePerPiece} SAR / pc</div>` : ""}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        ${badgeText ? `<span style="font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; background-color: ${colors.badgeBg || "#004b40"}; color: ${colors.badgeText || "#ffffff"};">${escapeHTML(badgeText)}</span>` : ""}
        ${savings > 0 ? `<span style="font-size: 12px; font-weight: 700; color: ${colors.savings || "#16a34a"};">${isAr ? "وفر" : "Save"} ${savings.toFixed(2)} SAR</span>` : ""}
      </div>
    `;

    tierItem.addEventListener("click", () => {
      if (window.__CART_BUNDLES_TRACK__ && offer.id) {
        window.__CART_BUNDLES_TRACK__({
          merchantId: Number(merchantId),
          offerId: Number(offer.id),
          event: "offer.click",
          productId: Number(productId),
          source: "quantity",
        });
      }
      cardContainer.querySelectorAll(".tier-item").forEach((el, idx) => {
        const radio = el.querySelector('input[type="radio"]');
        if (idx === index) {
          el.classList.add("selected");
          el.style.borderColor = colors.badgeBg || "#004b40";
          el.style.backgroundColor = colors.selectedTier || "#f0fdf4";
          if (radio) radio.checked = true;
        } else {
          el.classList.remove("selected");
          el.style.borderColor = colors.cardBorder || "#e2e8f0";
          el.style.backgroundColor = "transparent";
          if (radio) radio.checked = false;
        }
      });
      setSallaQuantity(tier.quantity);
    });

    tiersListEl.appendChild(tierItem);
  });

  // Apply default selected tier quantity on load
  if (tiers[selectedIndex]) setSallaQuantity(tiers[selectedIndex].quantity);

  // Track add_to_cart when the main product is added with a tier selected
  if (typeof salla !== "undefined" && salla.event && offer.id) {
    salla.event.on("cart::item-added", (res) => {
      const addedId = res?.data?.product_id;
      if (!addedId || String(addedId) !== String(productId)) return;
      if (window.__CART_BUNDLES_TRACK__) {
        window.__CART_BUNDLES_TRACK__({
          merchantId: Number(merchantId),
          offerId: Number(offer.id),
          event: "offer.add_to_cart",
          productId: Number(productId),
          source: "quantity",
        });
      }
    });
  }

  return cardContainer;
}