/**
 * Bundle Offer Embed — CartBundles
 *
 * Reads pre-fetched offers from window.__CBCore (populated by master-script.js).
 * Does NOT make its own API call.
 */
salla.onReady(() => {
  if (window.__BUNDLE_OFFER_EMBED_LOADED__) return;
  window.__BUNDLE_OFFER_EMBED_LOADED__ = true;

  if (document.getElementById("custom-bundle-widgets-root")) return;

  let executed = false;
  function run() {
    if (executed) return;
    const core = window.__CBCore;
    if (!core || !core.isLoaded) return;
    executed = true;

    const offers = core.offers || [];
    const bundleOffers = offers.filter((o) => o.kind === "bundle");
    if (!bundleOffers.length) return;

    const anchor = core.getTargetAnchor();
    if (!anchor) return;

    initBundleWidgets(bundleOffers, anchor, core);
  }

  if (window.__CBCore?.isLoaded) {
    run();
  } else {
    document.addEventListener("cb:core-loaded", run, { once: true });
    document.addEventListener("cb:offers-ready", run, { once: true });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateBundlePricing(mainProduct, items, discountType, discountAmount) {
  const activeItems = items.filter((item) => item.selected);
  const mainPrice = mainProduct ? mainProduct.price : 0;
  const itemsPriceSum = activeItems.reduce((acc, item) => acc + item.price, 0);
  const rawTotal = mainPrice + itemsPriceSum;
  const amt = parseFloat(discountAmount || 0);

  let finalTotal = rawTotal;
  if (discountType === "percentage" && amt > 0) {
    finalTotal = Math.max(0, rawTotal * (1 - amt / 100));
  } else if ((discountType === "fixed" || discountType === "amount") && amt > 0) {
    finalTotal = Math.max(0, rawTotal - amt);
  } else if (discountType === "free_product" || discountType === "free-product") {
    finalTotal = Math.max(0, mainPrice);
  }

  return { rawTotal, finalTotal, savings: Math.max(0, rawTotal - finalTotal) };
}

// ─── Widget Builder ───────────────────────────────────────────────────────────
async function initBundleWidgets(bundleOffers, anchor, core) {
  const { isAr, escapeHTML, formatPrice, addItemWithDefaultOptions, productId, currency, merchantId } = core;

  const rootContainer = document.createElement("div");
  rootContainer.id = "custom-bundle-widgets-root";

  for (let i = 0; i < bundleOffers.length; i++) {
    try {
      const widget = await buildBundleWidget(bundleOffers[i], i, { isAr, escapeHTML, formatPrice, addItemWithDefaultOptions, productId, currency, merchantId });
      if (widget) {
        rootContainer.appendChild(widget);
        if (window.__CART_BUNDLES_TRACK__ && bundleOffers[i]?.id) {
          window.__CART_BUNDLES_TRACK__({
            merchantId: Number(merchantId),
            offerId: Number(bundleOffers[i].id),
            event: "offer.impression",
            productId: Number(productId),
            source: "bundle",
          });
        }
      }
    } catch (err) {
      console.error("[BundleOffer] Error initializing bundle offers:", err);
    }
  }

  if (rootContainer.hasChildNodes()) {
    anchor.insertAdjacentElement("beforebegin", rootContainer);
  }
}

async function buildBundleWidget(bundleOffer, index, { isAr, escapeHTML, formatPrice, addItemWithDefaultOptions, productId, currency, merchantId }) {
  const relatedProducts = bundleOffer.relatedProducts || [];
  if (!relatedProducts.length) return null;

  const title = bundleOffer.title?.[isAr ? "ar" : "en"] || bundleOffer.title?.ar || "";
  const subtitle = bundleOffer.subtitle?.[isAr ? "ar" : "en"] || bundleOffer.subtitle?.ar || "";
  const settings = bundleOffer.bundleSettings || {};
  const discountType = settings.discountType || "percentage";
  const discountAmount = parseFloat(settings.discountAmount || 0);
  const redirectToCart = Boolean(bundleOffer.redirectToCartAfterAdd ?? settings.redirectToCartAfterAdd);

  // Fetch all products in parallel
  const allProductIds = [productId, ...relatedProducts.map((p) => p.sallaProductId)];
  const productResults = await Promise.allSettled(
    allProductIds.map((id) =>
      salla.product.getDetails(id, ["options"]).then((res) => ({ id, res }))
    )
  );

  const productMap = new Map();
  for (const res of productResults) {
    if (res.status === "fulfilled" && res.value.res?.data) {
      const d = res.value.res.data;
      let img = d.main_image || d.image || d.thumbnail || (d.images && d.images[0]?.url);
      if (typeof img === "object" && img !== null) img = img.url;
      productMap.set(res.value.id, {
        id: d.id,
        name: d.name || "",
        price: parseFloat(d.price?.amount ?? d.price ?? 0),
        image: img || "",
        url: d.url || d.urls?.customer || "#",
        options: Array.isArray(d.options) ? d.options : [],
      });
    }
  }

  const mainProductData = productMap.get(productId) || {
    id: productId,
    name: isAr ? "المنتج الحالي" : "Current Product",
    price: 0,
    image: "",
    url: "#",
    options: [],
  };

  const bundleItemsData = relatedProducts
    .map((item) => {
      const details = productMap.get(item.sallaProductId);
      if (!details) return null;
      return { ...details, isPreselected: item.isPreselected ?? true, selected: item.isPreselected ?? true };
    })
    .filter(Boolean);

  if (!bundleItemsData.length) return null;

  const colors = bundleOffer.appearance?.colors || {};
  const radius = bundleOffer.appearance?.borderRadiusPx ?? 12;
  const core = window.__CBCore;
  const align = (core && core.headingAlign && core.headingAlign(bundleOffer.appearance)) || "start";
  const cardCss =
    (core && core.appearanceCardCss && core.appearanceCardCss(bundleOffer.appearance, "margin: 2rem 0; padding: 18px;")) ||
    `margin: 2rem 0; padding: 18px; border-radius: ${radius}px; background-color: ${colors.cardBg || "#ffffff"}; border: 1px solid ${colors.cardBorder || "#e2e8f0"}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); font-family: inherit;`;

  const cardContainer = document.createElement("div");
  cardContainer.className = "custom-bundle-widget";
  cardContainer.dataset.offerId = bundleOffer.id ?? index;
  cardContainer.setAttribute("dir", isAr ? "rtl" : "ltr");
  cardContainer.style.cssText = cardCss;

  let html = `
    <div style="margin-bottom: 14px; text-align: ${align};">
      <h3 style="font-size: 1.15rem; font-weight: 700; color: ${colors.titleColor || "#1e293b"}; margin: 0 0 4px 0;">
        ${escapeHTML(title || (isAr ? "اشتري المجموعة ووفر" : "Buy Bundle & Save"))}
      </h3>
      ${subtitle ? `<p style="font-size: 0.85rem; color: #64748b; margin: 0;">${escapeHTML(subtitle)}</p>` : ""}
    </div>

    <div class="bundle-products-grid" style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px;">
      <!-- Main Product -->
      <div class="bundle-item-card" style="flex: 1; min-width: 130px; max-width: 160px; border: 1.5px solid ${colors.badgeBg || "#004d5b"}; border-radius: ${radius}px; padding: 10px; background: #f8fafc; text-align: center;">
        <div style="position: relative; aspect-ratio: 1; border-radius: ${radius}px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
          <span style="position: absolute; top: 4px; inset-inline-start: 4px; background: ${colors.badgeBg || "#004d5b"}; color: ${colors.badgeText || "#ffffff"}; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: ${radius}px; z-index: 2;">${isAr ? "الأساسي" : "Main"}</span>
          <img src="${escapeHTML(mainProductData.image)}" alt="${escapeHTML(mainProductData.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        <div style="font-size: 0.8rem; font-weight: 600; color: #1e293b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em; line-height: 1.2; margin-bottom: 4px;">${escapeHTML(mainProductData.name)}</div>
        <div style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">${formatPrice(mainProductData.price)}</div>
      </div>
  `;

  bundleItemsData.forEach((item, idx) => {
    html += `
      <div style="font-size: 1.2rem; font-weight: 700; color: #94a3b8; align-self: center;">+</div>
      <div class="bundle-item-card" data-idx="${idx}" style="flex: 1; min-width: 130px; max-width: 160px; border: 1px solid ${colors.cardBorder || "#e2e8f0"}; border-radius: ${radius}px; padding: 10px; background: #ffffff; text-align: center; transition: all 0.2s ease;">
        <div style="position: relative; aspect-ratio: 1; border-radius: ${radius}px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
          <input type="checkbox" class="bundle-item-cb" data-idx="${idx}" ${item.selected ? "checked" : ""} style="position: absolute; top: 6px; inset-inline-start: 6px; width: 18px; height: 18px; accent-color: ${colors.badgeBg || "#004d5b"}; cursor: pointer; z-index: 3;" />
          <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        <div style="font-size: 0.8rem; font-weight: 600; color: #1e293b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em; line-height: 1.2; margin-bottom: 4px;">${escapeHTML(item.name)}</div>
        <div style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">${formatPrice(item.price)}</div>
      </div>
    `;
  });

  html += `
    </div>

    <!-- Bundle Summary Bar -->
    <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border-radius: ${radius}px; background: ${colors.selectedTier || "#f0fdf4"}; border: 1px dashed ${colors.cardBorder || "#cbd5e1"};">
      <div>
        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 2px;">${isAr ? "إجمالي الحزمة:" : "Bundle Total:"}</div>
        <div style="display: flex; align-items: baseline; gap: 8px;">
          <span class="bundle-final-price" style="font-size: 1.25rem; font-weight: 800; color: #0f172a;"></span>
          <span class="bundle-raw-price" style="font-size: 0.85rem; text-decoration: line-through; color: #94a3b8;"></span>
          <span class="bundle-savings-badge" style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: ${colors.badgeBg || "#004d5b"}; color: ${colors.badgeText || "#ffffff"}; display: none;"></span>
        </div>
      </div>
      <button type="button" class="bundle-add-all-btn" style="padding: 10px 20px; border: none; border-radius: ${radius}px; background: ${colors.badgeBg || "#004d5b"}; color: ${colors.badgeText || "#ffffff"}; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s ease;">
        ${isAr ? "إضافة المجموعة للسلة" : "Add Bundle to Cart"}
      </button>
    </div>
  `;

  cardContainer.innerHTML = html;

  const finalPriceEl = cardContainer.querySelector(".bundle-final-price");
  const rawPriceEl = cardContainer.querySelector(".bundle-raw-price");
  const savingsBadgeEl = cardContainer.querySelector(".bundle-savings-badge");
  const addAllBtn = cardContainer.querySelector(".bundle-add-all-btn");

  function updatePricingUI() {
    const pricing = calculateBundlePricing(mainProductData, bundleItemsData, discountType, discountAmount);
    if (finalPriceEl) finalPriceEl.innerHTML = formatPrice(pricing.finalTotal);
    if (rawPriceEl) {
      rawPriceEl.innerHTML = pricing.savings > 0 ? formatPrice(pricing.rawTotal) : "";
      rawPriceEl.style.display = pricing.savings > 0 ? "inline" : "none";
    }
    if (savingsBadgeEl) {
      if (pricing.savings > 0) {
        savingsBadgeEl.textContent = `${isAr ? "وفر" : "Save"} ${pricing.savings.toFixed(2)} ${currency}`;
        savingsBadgeEl.style.display = "inline-block";
      } else {
        savingsBadgeEl.style.display = "none";
      }
    }
  }

  cardContainer.querySelectorAll(".bundle-item-cb").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      if (!isNaN(idx) && bundleItemsData[idx]) {
        bundleItemsData[idx].selected = e.target.checked;
        updatePricingUI();
      }
    });
  });

  addAllBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    addAllBtn.disabled = true;
    addAllBtn.style.opacity = "0.7";
    try {
      if (window.__CART_BUNDLES_TRACK__ && bundleOffer.id) {
        window.__CART_BUNDLES_TRACK__({
          merchantId: Number(merchantId),
          offerId: Number(bundleOffer.id),
          event: "offer.click",
          productId: Number(productId),
          source: "bundle",
        });
      }
      await addItemWithDefaultOptions(mainProductData, 1);
      const selectedItems = bundleItemsData.filter((i) => i.selected);
      for (const item of selectedItems) {
        try {
          await addItemWithDefaultOptions(item, 1);
        } catch (err) {
          console.warn(`[BundleOffer] Failed to add item ${item.id}:`, err);
        }
      }
      if (window.__CART_BUNDLES_TRACK__ && bundleOffer.id) {
        window.__CART_BUNDLES_TRACK__({
          merchantId: Number(merchantId),
          offerId: Number(bundleOffer.id),
          event: "offer.add_to_cart",
          productId: Number(productId),
          source: "bundle",
        });
      }
      if (salla.notify) salla.notify.success(isAr ? "تمت إضافة المجموعة إلى السلة بنجاح!" : "Bundle added to cart successfully!");
      if (redirectToCart) {
        window.location.href = (salla.url && salla.url.get("cart")) || "/cart";
      }
    } catch (err) {
      console.error("[BundleOffer] Error adding bundle to cart:", err);
      if (salla.notify) salla.notify.error(isAr ? "فشل إضافة المجموعة للسلة" : "Failed to add bundle to cart");
    } finally {
      addAllBtn.disabled = false;
      addAllBtn.style.opacity = "1";
    }
  });

  updatePricingUI();
  return cardContainer;
}
