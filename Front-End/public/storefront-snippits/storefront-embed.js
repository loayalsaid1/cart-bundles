/**
 * Master Storefront Embed Script for Salla Storefront (Handles All Offer Types)
 */
(function () {
  "use strict";

  if (window.__STOREFRONT_OFFER_EMBED_LOADED__) return;
  window.__STOREFRONT_OFFER_EMBED_LOADED__ = true;

  const currentScript = document.currentScript;
  const API_BASE =
    "https://jq1no5-ip-156-210-130-189.tunnelmole.net/api/v1";

  const selectedAddonIds = new Set();

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

    return 100;
  }

  function calculateDiscountedPrice(price, discountType, discountAmount) {
    const p = parseFloat(price) || 0;
    const amt = parseFloat(discountAmount) || 0;
    if (discountType === "percentage") {
      return Math.max(0, p * (1 - amt / 100));
    } else if (discountType === "fixed") {
      return Math.max(0, p - amt);
    }
    return p;
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

  async function fetchProductDetails(sallaProductId) {
    if (typeof salla !== "undefined" && salla.product && salla.product.getDetails) {
      try {
        const res = await salla.product.getDetails(sallaProductId);
        if (res && res.data) {
          const d = res.data;
          const priceAmt = parseFloat(d.price?.amount || d.price || 0);
          const image = d.main_image || d.thumbnail || (Array.isArray(d.images) && d.images[0]?.url) || null;
          return {
            id: d.id,
            name: d.name || "",
            price: priceAmt,
            image: typeof image === "string" ? image : image?.url || null,
          };
        }
      } catch (err) {
        console.warn("[StorefrontEmbed] Failed to fetch product details:", err);
      }
    }
    return { id: sallaProductId, name: null, price: 0, image: null };
  }

  // --- QUANTITY DISCOUNT RENDERER ---
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
    if (title) html += `<div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">${title}</div>`;
    if (subtitle) html += `<div style="font-size: 13px; color: #64748b; margin-bottom: 12px;">${subtitle}</div>`;
    html += `<div class="offer-tiers-list" style="display: flex; flex-direction: column; gap: 8px;"></div>`;
    cardContainer.innerHTML = html;

    const listEl = cardContainer.querySelector(".offer-tiers-list");
    let selectedIndex = tiers.findIndex((t) => t.isSelectedByDefault);
    if (selectedIndex === -1) selectedIndex = 0;

    tiers.forEach((tier, index) => {
      const isSelected = index === selectedIndex;
      const total = calculateDiscountedPrice(unitPrice * tier.quantity, tier.pricingType, tier.discountAmount);
      const originalTotal = unitPrice * tier.quantity;
      const savings = Math.max(0, originalTotal - total);

      const tierTitle = tier.mainTitle?.[lang] || tier.mainTitle?.ar || `${tier.quantity} x`;
      const badgeText = tier.badgeText || "";
      const pricePerPiece = settings.showPricePerPiece ? (total / tier.quantity).toFixed(2) : null;

      const tierItem = document.createElement("div");
      tierItem.className = `tier-item ${isSelected ? "selected" : ""}`;
      tierItem.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 12px; border-radius: ${Math.max(4, radius - 4)}px;
        border: 1.5px solid ${isSelected ? colors.badgeBg || "#004b40" : colors.cardBorder || "#e2e8f0"};
        background-color: ${isSelected ? colors.selectedTier || "#f0fdf4" : "transparent"};
        cursor: pointer; transition: all 0.2s ease;
      `;

      tierItem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="radio" name="quantity_offer_tier" ${isSelected ? "checked" : ""} style="accent-color: ${colors.badgeBg || "#004b40"}; cursor: pointer;" />
          <div>
            <span style="font-size: 13px; font-weight: 600; color: #0f172a;">${tierTitle}</span>
            ${pricePerPiece ? `<div style="font-size: 11px; color: #64748b;">${pricePerPiece} SAR / pc</div>` : ""}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${badgeText ? `<span style="font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; background-color: ${colors.badgeBg || "#004b40"}; color: ${colors.badgeText || "#ffffff"};">${badgeText}</span>` : ""}
          ${savings > 0 ? `<span style="font-size: 12px; font-weight: 700; color: ${colors.savings || "#16a34a"};">${isRtl ? "وفر" : "Save"} ${savings.toFixed(2)} SAR</span>` : ""}
        </div>
      `;

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

      listEl.appendChild(tierItem);
    });

    if (tiers[selectedIndex]) {
      setSallaQuantity(tiers[selectedIndex].quantity);
    }

    return cardContainer;
  }

  // --- ADDON OFFER RENDERER ---
  async function renderAddonOfferCard(offer) {
    const lang = getLanguage();
    const isRtl = lang === "ar";
    const title = offer.title?.[lang] || offer.title?.ar || "";
    const subtitle = offer.subtitle?.[lang] || offer.subtitle?.ar || "";
    const relatedItems = (offer.relatedProducts || []).sort((a, b) => (a.position || 0) - (b.position || 0));

    if (!relatedItems.length) return null;

    const colors = offer.appearance?.colors || {};
    const radius = offer.appearance?.borderRadiusPx ?? 12;
    const settings = offer.addonSettings || {};
    const orientation = settings.displayOrientation || "horizontal";

    const productDetailsList = await Promise.all(
      relatedItems.map((item) => fetchProductDetails(item.sallaProductId))
    );

    const cardContainer = document.createElement("div");
    cardContainer.className = "salla-addon-offer-card";
    cardContainer.setAttribute("dir", isRtl ? "rtl" : "ltr");
    cardContainer.style.cssText = `
      margin: 16px 0; padding: 16px; border-radius: ${radius}px;
      background-color: ${colors.cardBg || "#ffffff"};
      border: 1px solid ${colors.cardBorder || "#e2e8f0"};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); font-family: inherit;
    `;

    let html = "";
    if (title) html += `<div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">${title}</div>`;
    if (subtitle) html += `<div style="font-size: 13px; color: #64748b; margin-bottom: 12px;">${subtitle}</div>`;

    const flexStyle = orientation === "horizontal"
      ? "display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;"
      : "display: flex; flex-direction: column; gap: 10px;";

    html += `<div class="addon-products-list" style="${flexStyle}"></div>`;
    cardContainer.innerHTML = html;

    const listEl = cardContainer.querySelector(".addon-products-list");

    relatedItems.forEach((item, index) => {
      const details = productDetailsList[index];
      const isPreselected = Boolean(item.isPreselected);

      if (isPreselected) selectedAddonIds.add(item.sallaProductId);

      const origPrice = details.price || 0;
      const finalPrice = calculateDiscountedPrice(origPrice, settings.discountType, settings.discountAmount);
      const savings = Math.max(0, origPrice - finalPrice);
      const nameText = details.name || `${isRtl ? "منتج إضافي" : "Add-on"} #${index + 1}`;

      const itemCard = document.createElement("div");
      const widthStyle = orientation === "horizontal" ? "min-width: 140px; width: 140px; flex-shrink: 0;" : "width: 100%;";

      itemCard.style.cssText = `
        ${widthStyle} padding: 10px; border-radius: ${Math.max(4, radius - 4)}px;
        border: 1.5px solid ${isPreselected ? colors.badgeBg || "#004b40" : colors.cardBorder || "#e2e8f0"};
        background-color: ${isPreselected ? colors.selectedTier || "#f0fdf4" : "transparent"};
        box-sizing: border-box; transition: all 0.2s ease;
      `;

      let imgHtml = details.image
        ? `<img src="${details.image}" alt="${nameText}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />`
        : `<div style="width: 100%; height: 80px; background-color: #f1f5f9; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94a3b8; margin-bottom: 8px;">${isRtl ? "صورة المنتج" : "Product Image"}</div>`;

      itemCard.innerHTML = `
        ${imgHtml}
        <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px;">
          <input type="checkbox" class="addon-checkbox" ${isPreselected ? "checked" : ""} style="accent-color: ${colors.badgeBg || "#004b40"}; cursor: pointer;" />
          <span style="font-size: 12px; font-weight: 600; color: #1e293b; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${nameText}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
          <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${finalPrice.toFixed(2)} SAR</div>
          ${savings > 0 ? `<span style="font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background-color: ${colors.badgeBg || "#004b40"}; color: ${colors.badgeText || "#ffffff"};">${isRtl ? "خصم" : "SAVE"}</span>` : ""}
        </div>
        <button type="button" class="addon-add-btn" style="margin-top: 8px; width: 100%; padding: 6px; border: none; border-radius: 6px; background-color: ${colors.badgeBg || "#004b40"}; color: ${colors.badgeText || "#ffffff"}; font-size: 11px; font-weight: 600; cursor: pointer;">${isRtl ? "إضافة للسلة" : "Add to Cart"}</button>
      `;

      const checkbox = itemCard.querySelector(".addon-checkbox");
      const addBtn = itemCard.querySelector(".addon-add-btn");

      const toggle = (checked) => {
        if (checked) {
          selectedAddonIds.add(item.sallaProductId);
          itemCard.style.borderColor = colors.badgeBg || "#004b40";
          itemCard.style.backgroundColor = colors.selectedTier || "#f0fdf4";
        } else {
          selectedAddonIds.delete(item.sallaProductId);
          itemCard.style.borderColor = colors.cardBorder || "#e2e8f0";
          itemCard.style.backgroundColor = "transparent";
        }
        if (checkbox) checkbox.checked = checked;
      };

      if (checkbox) checkbox.addEventListener("change", (e) => toggle(e.target.checked));
      if (addBtn) {
        addBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          if (typeof salla !== "undefined" && salla.cart) {
            await salla.cart.addItem({ id: item.sallaProductId, quantity: 1 });
            if (salla.notify) salla.notify.success(isRtl ? "تمت الإضافة إلى السلة" : "Added to cart");
          }
        });
      }

      listEl.appendChild(itemCard);
    });

    if (typeof salla !== "undefined" && salla.event) {
      salla.event.on("cart::item-added", async () => {
        if (!selectedAddonIds.size) return;
        const ids = Array.from(selectedAddonIds);
        selectedAddonIds.clear();
        for (const addonId of ids) {
          try { await salla.cart.addItem({ id: addonId, quantity: 1 }); } catch (e) {}
        }
      });
    }

    return cardContainer;
  }

  async function initStorefrontOffers() {
    const { merchantId, productId } = getStoreAndProductInfo();
    if (!merchantId) return;

    const anchor = getTargetAnchor();
    if (!anchor) return;

    let categoryIds = [];
    if (productId && salla?.product?.getDetails) {
      try {
        const res = await salla.product.getDetails(productId, ["category"]);
        const cat = res.data?.category;
        if (cat) {
          categoryIds = Array.isArray(cat) ? cat.map((c) => c.id).filter(Boolean) : [cat.id];
        }
      } catch (err) {}
    }

    try {
      const urlParams = new URLSearchParams();
      if (productId) urlParams.append("productId", productId);
      if (categoryIds.length > 0) urlParams.append("categoryIds", categoryIds.join(","));

      const qs = urlParams.toString();
      const url = `${API_BASE}/offers/storefront/${merchantId}${qs ? `?${qs}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) return;

      const offers = await response.json();
      if (!Array.isArray(offers) || !offers.length) return;

      // Check for Addon Offer
      const addonOffer = offers.find((o) => o.kind === "product_add_on");
      if (addonOffer) {
        const addonCard = await renderAddonOfferCard(addonOffer);
        if (addonCard) anchor.insertAdjacentElement("beforebegin", addonCard);
      }

      // Check for Quantity Offer
      const quantityOffer = offers.find((o) => o.kind === "quantity_discount");
      if (quantityOffer) {
        const quantityCard = renderQuantityOfferCard(quantityOffer);
        if (quantityCard) anchor.insertAdjacentElement("beforebegin", quantityCard);
      }
    } catch (err) {
      console.error("[StorefrontEmbed] Error loading offers:", err);
    }
  }

  if (typeof salla !== "undefined" && salla.onReady) {
    salla.onReady(initStorefrontOffers);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStorefrontOffers);
  } else {
    initStorefrontOffers();
  }
})();
