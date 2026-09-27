/**
 * Addon Offer Embed — CartBundles
 *
 * Reads pre-fetched offers from window.__CBCore (populated by master-script.js).
 * Does NOT make its own API call.
 * Does NOT register cart::item-added (handled by master-script.js).
 */
salla.onReady(() => {
  if (window.__ADDON_OFFER_EMBED_LOADED__) return;
  window.__ADDON_OFFER_EMBED_LOADED__ = true;

  if (document.getElementById("custom-addon-widgets-root")) return;

  let executed = false;
  function run() {
    if (executed) return;
    const core = window.__CBCore;
    if (!core || !core.isLoaded) return;
    executed = true;

    const offers = core.offers || [];
    const addonOffers = offers.filter((o) => o.kind === "product_add_on");
    if (!addonOffers.length) return;

    renderAddonWidgets(addonOffers, core);
  }

  if (window.__CBCore?.isLoaded) {
    run();
  } else {
    document.addEventListener("cb:core-loaded", run, { once: true });
    document.addEventListener("cb:offers-ready", run, { once: true });
  }
});

// ─── Widget Builder ────────────────────────────────────────────────────────────
async function renderAddonWidgets(addonOffers, core) {
  const { isAr, escapeHTML, formatPrice, addItemWithDefaultOptions, merchantId, productId } = core;

  const root = document.createElement("div");
  root.id = "custom-addon-widgets-root";

  // Map to hold references to all parsed products across widgets
  const globalProductsMap = new Map();

  for (let i = 0; i < addonOffers.length; i++) {
    try {
      const { widgetEl, productsMap } = (await buildAddonWidget(
        addonOffers[i],
        i,
        { isAr, escapeHTML, formatPrice, addItemWithDefaultOptions, merchantId, productId }
      )) || {};

      if (widgetEl) {
        root.appendChild(widgetEl);

        if (productsMap) {
          productsMap.forEach((val, key) => globalProductsMap.set(key, val));
        }

        if (window.__CART_BUNDLES_TRACK__ && addonOffers[i]?.id) {
          window.__CART_BUNDLES_TRACK__({
            merchantId: Number(merchantId),
            offerId: Number(addonOffers[i].id),
            event: "offer.impression",
            productId: Number(productId),
            source: "addon",
          });
        }
      }
    } catch (err) {
      console.warn("[AddonOffer] Failed to build widget for offer:", addonOffers[i]?.id, err);
    }
  }

  if (!root.children.length) return;

  const anchor =
    document.querySelector("form#product-form") ||
    document.querySelector(".product-form") ||
    document.querySelector("div.options");
  if (anchor) {
    anchor.insertAdjacentElement("beforebegin", root);
  } else {
    document.body.appendChild(root);
  }

  // Bind listener to main Add to Cart form submit
  const mainForm = document.querySelector("form#product-form") || document.querySelector(".product-form");
  if (mainForm) {
    mainForm.addEventListener("submit", async (e) => {
      const checkedBoxes = root.querySelectorAll(".salla-addon-cb:checked");
      if (!checkedBoxes.length) return;

      // Add checked add-on products in parallel before submitting main form
      const promises = Array.from(checkedBoxes).map(async (cb) => {
        const prodId = cb.value;
        const product = globalProductsMap.get(String(prodId));
        if (product) {
          try {
            await addItemWithDefaultOptions(product, 1);
            if (window.__CART_BUNDLES_TRACK__) {
              window.__CART_BUNDLES_TRACK__({
                merchantId: Number(merchantId),
                offerId: Number(cb.dataset.offerId || 0),
                event: "offer.add_to_cart",
                productId: Number(prodId),
                source: "addon_bundle_submit",
              });
            }
          } catch (err) {
            console.warn("[AddonOffer] Batch add failed for product:", prodId, err);
          }
        }
      });

      await Promise.allSettled(promises);
    });
  }
}

async function buildAddonWidget(addonOffer, index, { isAr, escapeHTML, formatPrice, addItemWithDefaultOptions, merchantId, productId }) {
  if (!addonOffer.relatedProducts?.length) return null;

  const title = addonOffer.title?.[isAr ? "ar" : "en"] || addonOffer.title?.ar || "";
  const subtitle = addonOffer.subtitle?.[isAr ? "ar" : "en"] || addonOffer.subtitle?.ar || "";
  const discountType = addonOffer.addonSettings?.discountType || "percentage";
  const discountAmount = parseFloat(addonOffer.addonSettings?.discountAmount || 0);
  const displayOrientation =
    addonOffer.addonSettings?.displayOrientation ||
    addonOffer.settings?.displayOrientation ||
    addonOffer.displayOrientation ||
    "horizontal";

  const colors = addonOffer.appearance?.colors || {};
  const radius = addonOffer.appearance?.borderRadiusPx ?? 12;
  const core = window.__CBCore;
  const align = (core && core.headingAlign && core.headingAlign(addonOffer.appearance)) || "start";
  const cardCss =
    (core && core.appearanceCardCss && core.appearanceCardCss(addonOffer.appearance, "margin: 2.5rem 0; padding: 18px;")) ||
    `margin: 2.5rem 0; padding: 18px; border-radius: ${radius}px; background-color: ${colors.cardBg || "#ffffff"}; border: 1px solid ${colors.cardBorder || "#e2e8f0"}; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); font-family: inherit;`;

  // Fetch all related products in parallel
  const productResults = await Promise.allSettled(
    addonOffer.relatedProducts.map((item) =>
      salla.product.getDetails(item.sallaProductId, ["options"]).then((pRes) => ({ item, pRes }))
    )
  );

  const productsData = [];
  for (const result of productResults) {
    if (result.status !== "fulfilled" || !result.value.pRes?.data) {
      if (result.status === "rejected") console.warn("[AddonOffer] Failed to load product:", result.reason);
      continue;
    }
    const { item, pRes } = result.value;
    const d = pRes.data;
    let img = d.main_image || d.image || d.thumbnail || (d.images && d.images[0]?.url);
    if (typeof img === "object" && img !== null) img = img.url;

    productsData.push({
      id: item.sallaProductId,
      isPreselected: item.isPreselected,
      name: d.name,
      image: img || "",
      origPrice: parseFloat(d.price?.amount ?? d.price ?? 0),
      options: Array.isArray(d.options) ? d.options : [],
      url: d.url || d.urls?.customer || "#",
    });
  }

  if (!productsData.length) return null;

  const widget = document.createElement("div");
  widget.className = "custom-addon-widget";
  widget.dataset.offerId = addonOffer.id ?? index;
  widget.style.cssText = cardCss;

  const containerStyle =
    displayOrientation === "vertical"
      ? "display: flex; flex-direction: column; gap: 10px;"
      : "display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none;";

  const btnText = isAr ? "إضافة للسلة" : "Add to Cart";

  let html = `
    <h3 style="font-size: 1.15rem; font-weight: bold; color: var(--color-text, #1f2937); margin-bottom: 0.25rem; text-align: ${align};">${escapeHTML(title)}</h3>
    ${subtitle ? `<p style="font-size: 0.9rem; color: var(--color-grey-500, #6b7280); margin-bottom: 1.25rem; text-align: ${align};">${escapeHTML(subtitle)}</p>` : ""}
    <div style="${containerStyle}">
  `;

  productsData.forEach((p) => {
    const finalPrice =
      discountType === "free-product" || discountType === "free_product"
        ? 0
        : discountType === "percentage"
        ? Math.max(0, p.origPrice * (1 - discountAmount / 100))
        : p.origPrice;

    const isSale = p.origPrice > finalPrice && finalPrice >= 0;
    const actualPrice = Math.max(0, finalPrice);
    const checkboxHtml = `<input type="checkbox" class="salla-addon-cb" value="${p.id}" data-offer-id="${addonOffer.id ?? index}" data-url="${escapeHTML(p.url)}" ${p.isPreselected ? "checked" : ""} style="margin-top: 2px; width: 16px; height: 16px; flex-shrink: 0; accent-color: ${colors.badgeBg || "#004b40"};" />`;

    if (displayOrientation === "vertical") {
      html += `
        <div style="border-radius: ${radius}px; border: 1px solid ${colors.cardBorder || "#e2e8f0"}; overflow: hidden; background: #ffffff; display: flex; align-items: center; gap: 12px; padding: 10px; width: 100%; box-sizing: border-box;">
          <a href="${escapeHTML(p.url)}" style="text-decoration: none; color: inherit; display: block; flex-shrink: 0; width: 80px; aspect-ratio: 3/4; border-radius: ${Math.max(4, radius - 4)}px; overflow: hidden; position: relative; border: 1px solid ${colors.cardBorder || "#e2e8f0"}; background: #f1f5f9;">
            ${isSale ? `<span style="position: absolute; top: 4px; inset-inline-start: 4px; z-index: 2; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; color: #fff; background: #ef4444;">${isAr ? "خصم" : "Sale"}</span>` : ""}
            ${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="display: flex; height: 100%; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">...</div>`}
          </a>
          <div style="display: flex; flex-direction: column; justify-content: space-between; flex: 1; min-width: 0; align-self: stretch; padding: 2px 0;">
            <div>
              <label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer; margin-bottom: 4px;">
                ${checkboxHtml}
                <div style="font-size: 12px; font-weight: 600; color: ${colors.bodyText || "#0f172a"}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</div>
              </label>
              <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 13px; font-weight: 700; color: ${colors.badgeBg || colors.bodyText || "#16a34a"};">${formatPrice(actualPrice)}</span>
                ${isSale ? `<span style="font-size: 10px; text-decoration: line-through; color: #94a3b8;">${formatPrice(p.origPrice)}</span>` : ""}
              </div>
            </div>
            <div>
              <button type="button" class="salla-addon-add-btn" data-id="${p.id}" style="width: 100%; padding: 4px 8px; border: none; border-radius: ${Math.max(4, radius - 4)}px; background: ${colors.badgeBg || "#004b40"}; color: ${colors.badgeText || "#ffffff"}; font-size: 11px; font-weight: 600; cursor: pointer; min-height: 28px;">${btnText}</button>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div style="border-radius: ${radius}px; border: 1px solid ${colors.cardBorder || "#e2e8f0"}; overflow: hidden; background: #ffffff; display: flex; flex-direction: column; flex-shrink: 0; width: 170px;">
          <a href="${escapeHTML(p.url)}" style="text-decoration: none; color: inherit; display: block; flex-grow: 1;">
            <div style="position: relative; aspect-ratio: 3/4; border-bottom: 1px solid ${colors.cardBorder || "#e2e8f0"}; background: #f1f5f9; border-top-left-radius: ${radius}px; border-top-right-radius: ${radius}px; overflow: hidden;">
              ${isSale ? `<span style="position: absolute; top: 6px; inset-inline-start: 6px; z-index: 2; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #fff; background: #ef4444;">${isAr ? "خصم" : "Sale"}</span>` : ""}
              ${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="display: flex; height: 100%; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">...</div>`}
            </div>
            <div style="padding: 8px;">
              <label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer; margin-bottom: 4px;">
                ${checkboxHtml}
                <div style="font-size: 11px; font-weight: 600; color: ${colors.bodyText || "#0f172a"}; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</div>
              </label>
              <div style="font-size: 11px; font-weight: 700; color: ${colors.savings || colors.bodyText || "#16a34a"}; margin-bottom: 2px;">${formatPrice(actualPrice)}</div>
              ${isSale ? `<div style="font-size: 9px; text-decoration: line-through; color: #94a3b8; margin-bottom: 6px;">${formatPrice(p.origPrice)}</div>` : '<div style="height: 13.5px; margin-bottom: 6px;"></div>'}
            </div>
          </a>
          <div style="padding: 0 8px 8px 8px;">
            <button type="button" class="salla-addon-add-btn" data-id="${p.id}" style="width: 100%; padding: 6px; border: none; border-radius: ${Math.max(4, radius - 4)}px; background: ${colors.badgeBg || "#004b40"}; color: ${colors.badgeText || "#ffffff"}; font-size: 11px; font-weight: 600; cursor: pointer; min-height: 32px;">${btnText}</button>
          </div>
        </div>
      `;
    }
  });

  widget.innerHTML = html + "</div>";

  // Build id→product map for click handlers
  const productsByIdMap = new Map(productsData.map((p) => [String(p.id), p]));

  widget.querySelectorAll(".salla-addon-add-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      btn.style.opacity = "0.7";
      try {
        if (window.__CART_BUNDLES_TRACK__ && addonOffer.id) {
          window.__CART_BUNDLES_TRACK__({
            merchantId: Number(merchantId),
            offerId: Number(addonOffer.id),
            event: "offer.click",
            productId: Number(productId),
            source: "addon",
          });
        }
        const product = productsByIdMap.get(btn.getAttribute("data-id"));
        if (!product) throw new Error("Product not found in map");
        await addItemWithDefaultOptions(product, 1);
        if (window.__CART_BUNDLES_TRACK__ && addonOffer.id) {
          window.__CART_BUNDLES_TRACK__({
            merchantId: Number(merchantId),
            offerId: Number(addonOffer.id),
            event: "offer.add_to_cart",
            productId: Number(btn.getAttribute("data-id")),
            source: "addon",
          });
        }
        if (salla.notify) salla.notify.success(isAr ? "تمت الإضافة للسلة" : "Added to cart");
      } catch (err) {
        console.warn("[AddonOffer] addItem failed:", err);
        if (salla.notify) salla.notify.error(isAr ? "فشل الإضافة للسلة" : "Failed to add to cart");
      } finally {
        btn.disabled = false;
        btn.style.opacity = "1";
      }
    });
  });

  return { widgetEl: widget, productsMap: productsByIdMap };
}