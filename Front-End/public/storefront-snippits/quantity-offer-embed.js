/**
 * Storefront Quantity Offer Embed Script for Salla Product Pages
 */
(function () {
  "use strict";

  // Prevent duplicate initialization
  if (window.__QUANTITY_OFFER_EMBED_LOADED__) return;
  window.__QUANTITY_OFFER_EMBED_LOADED__ = true;

  
  // Configuration & API Base Detection
  const currentScript = document.currentScript;
  const API_BASE =
    "https://jq1no5-ip-156-210-130-189.tunnelmole.net/api/v1";

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

  function getStoreAndProductInfo() {
    let merchantId = null;
    let productId = null;

    if (typeof salla !== "undefined" && salla.config && salla.config.get) {
      merchantId = salla.config.get("store.id") || salla.config.get("user.id");
      productId = salla.config.get("page.id") || salla.config.get("product.id");
    }

    if (!merchantId && currentScript) {
      merchantId = currentScript.getAttribute("data-merchant-id");
    }
    if (!productId && currentScript) {
      productId = currentScript.getAttribute("data-product-id");
    }

    return { merchantId, productId };
  }

  function getLanguage() {
    if (typeof salla !== "undefined" && salla.config && salla.config.get) {
      const sallaLang = salla.config.get("user.language");
      if (sallaLang) return sallaLang.startsWith("ar") ? "ar" : "en";
    }
    return document.documentElement.lang?.startsWith("ar") ? "ar" : "en";
  }

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

    return 100; // Fallback unit price
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

  function renderQuantityOfferCard(offer) {
    const lang = getLanguage();
    const isRtl = lang === "ar";
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
    cardContainer.setAttribute("dir", isRtl ? "rtl" : "ltr");
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
    if (title) {
      html += `<div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">${title}</div>`;
    }
    if (subtitle) {
      html += `<div style="font-size: 13px; color: #64748b; margin-bottom: 12px;">${subtitle}</div>`;
    }

    html += `<div class="offer-tiers-list" style="display: flex; flex-direction: column; gap: 8px;"></div>`;
    cardContainer.innerHTML = html;

    const tiersListEl = cardContainer.querySelector(".offer-tiers-list");

    let selectedIndex = tiers.findIndex((t) => t.isSelectedByDefault);
    if (selectedIndex === -1) selectedIndex = 0;

    tiers.forEach((tier, index) => {
      const isSelected = index === selectedIndex;
      const total = calculateTierTotal(
        unitPrice,
        tier.quantity,
        tier.pricingType,
        tier.discountAmount,
        settings.roundPriceToNearestInteger,
      );
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
        border-radius: ${Math.max(4, radius - 4)}px;
        border: 1.5px solid ${isSelected ? colors.badgeBg || "#004b40" : colors.cardBorder || "#e2e8f0"};
        background-color: ${isSelected ? colors.selectedTier || "#f0fdf4" : "transparent"};
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      let tierHtml = `
        <div style="display: flex; items-center: center; gap: 10px;">
          <input type="radio" name="quantity_offer_tier" ${isSelected ? "checked" : ""} style="accent-color: ${colors.badgeBg || "#004b40"}; cursor: pointer;" />
          <div>
            <span style="font-size: 13px; font-weight: 600; color: #0f172a;">${tierTitle}</span>
            ${
              pricePerPiece
                ? `<div style="font-size: 11px; color: #64748b;">${pricePerPiece} SAR / pc</div>`
                : ""
            }
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${
            badgeText
              ? `<span style="font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; background-color: ${colors.badgeBg || "#004b40"}; color: ${colors.badgeText || "#ffffff"};">${badgeText}</span>`
              : ""
          }
          ${
            savings > 0
              ? `<span style="font-size: 12px; font-weight: 700; color: ${colors.savings || "#16a34a"};">${isRtl ? "وفر" : "Save"} ${savings.toFixed(2)} SAR</span>`
              : ""
          }
        </div>
      `;

      tierItem.innerHTML = tierHtml;

      tierItem.addEventListener("click", () => {
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
    if (tiers[selectedIndex]) {
      setSallaQuantity(tiers[selectedIndex].quantity);
    }

    return cardContainer;
  }

  async function initQuantityOffers() {
    const { merchantId, productId } = getStoreAndProductInfo();
    if (!merchantId) {
      console.warn("[QuantityOffer] Merchant ID not found. Embed skipped.");
      return;
    }

    const anchor = getTargetAnchor();
    if (!anchor) {
      console.warn("[QuantityOffer] Target product form anchor not found.");
      return;
    }

    let categoryIds = [];

    // Attempt to fetch Category ID dynamically via Salla's built-in API
    if (productId && salla?.product?.getDetails) {
      try {
        const response = await salla.product.getDetails(productId, ["category"]);
        const catData = response.data.category;
        
        if (catData) {
          // Future-proofing logic: if salla makes it an array later vs a single object right now
          if (Array.isArray(catData)) {
            categoryIds = catData.map(c => c.id).filter(Boolean);
          } else if (catData.id) {
            categoryIds.push(catData.id);
          }
        }
      } catch (err) {
        console.warn("[QuantityOffer] Failed to fetch category details, continuing without it.", err);
      }
    }

    try {
      // Build API URL cleanly using URLSearchParams
      const urlParams = new URLSearchParams();
      if (productId) urlParams.append("productId", productId);
      if (categoryIds.length > 0) urlParams.append("categoryIds", categoryIds.join(",")); // e.g: categoryIds=123,456

      const queryString = urlParams.toString();
      const url = `${API_BASE}/offers/storefront/${merchantId}${queryString ? `?${queryString}` : ""}`;
      
      const response = await fetch(url);
      if (!response.ok) return;

      const offers = await response.json();
      if (!Array.isArray(offers) || !offers.length) return;

      const quantityOffer = offers.find((o) => o.kind === "quantity_discount");
      if (!quantityOffer) return;

      const cardEl = renderQuantityOfferCard(quantityOffer);
      if (cardEl) {
        anchor.insertAdjacentElement("beforebegin", cardEl);
      }
    } catch (err) {
      console.error("[QuantityOffer] Error loading offer embed:", err);
    }
  }
  
  // Safe Execution Hook
  if (salla?.onReady) {
    salla.onReady(initQuantityOffers);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initQuantityOffers);
  } else {
    initQuantityOffers();
  }
})();