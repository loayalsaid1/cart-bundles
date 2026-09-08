salla.onReady(async () => {
  // Prevent duplicate initialization
  if (window.__ADDON_OFFER_EMBED_LOADED__) return;
  window.__ADDON_OFFER_EMBED_LOADED__ = true;

  // Prevent duplicate injections on SPA navigation (guard on a wrapper, not a per-offer id)
  if (document.getElementById('custom-addon-widgets-root')) return;

  const productId = salla.config.get("page.id") || salla.config.get("product.id");
  const merchantId = salla.config.get("store.id");

  const langConfig = salla.config.get("user.language");
  const isAr = langConfig ? langConfig.startsWith("ar") : true; // default ar only if language is unknown

  const API_BASE = "https://backend-dev.cartbundles.com/api/v1"; 
  const currency = salla.config.get("store.currency") || (isAr ? "ر.س" : "SAR");

  const formatPrice = (price) => `<bdi>${parseFloat(price).toFixed(2)} ${currency}</bdi>`;
  const escapeHTML = (str) => str ? String(str).replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t])) : '';

  // Builds a single offer's widget DOM element, or null if nothing to show
  async function buildOfferWidget(addonOffer, index) {
    if (!addonOffer.relatedProducts?.length) return null;

    const title = addonOffer.title?.[isAr ? 'ar' : 'en'] || addonOffer.title?.ar || "";
    const subtitle = addonOffer.subtitle?.[isAr ? 'ar' : 'en'] || addonOffer.subtitle?.ar || "";
    const discountType = addonOffer.addonSettings?.discountType || 'percentage';
    const discountAmount = parseFloat(addonOffer.addonSettings?.discountAmount || 0);

    const displayOrientation = addonOffer.addonSettings?.displayOrientation || addonOffer.settings?.displayOrientation || addonOffer.displayOrientation || 'horizontal';

    const colors = addonOffer.appearance?.colors || {};
    const radius = addonOffer.appearance?.borderRadiusPx ?? 12;

    // Fetch related products in parallel
    const productResults = await Promise.allSettled(
      addonOffer.relatedProducts.map((item) =>
        salla.product.getDetails(item.sallaProductId, ["options"]).then((pRes) => ({ item, pRes }))
      )
    );

    const productsData = [];
    for (const result of productResults) {
      if (result.status !== "fulfilled" || !result.value.pRes?.data) {
        if (result.status === "rejected") {
          console.warn("[AddonOffer] Failed to load product:", result.reason);
        }
        continue;
      }
      const { item, pRes } = result.value;
      const data = pRes.data;

      let img = data.main_image || data.image || data.thumbnail || (data.images && data.images[0]?.url);
      if (typeof img === 'object' && img !== null) img = img.url;

      productsData.push({
        id: item.sallaProductId,
        isPreselected: item.isPreselected,
        name: data.name,
        image: img || "",
        origPrice: parseFloat(data.price?.amount ?? data.price ?? 0),
        options: Array.isArray(data.options) ? data.options : [],
        url: data.url || data.urls?.customer || '#',
      });
    }

    if (!productsData.length) return null;

    const widget = document.createElement("div");
    widget.className = "custom-addon-widget";
    widget.dataset.offerId = addonOffer.id ?? index;
    widget.style.cssText = `margin: 2.5rem 0; text-align: start; font-family: inherit;`;

    const containerStyle = displayOrientation === 'vertical'
      ? 'display: flex; flex-direction: column; gap: 10px;'
      : 'display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none;';

    let html = `
      <h3 style="font-size: 1.15rem; font-weight: bold; color: var(--color-text, #1f2937); margin-bottom: 0.25rem;">${escapeHTML(title)}</h3>
      ${subtitle ? `<p style="font-size: 0.9rem; color: var(--color-grey-500, #6b7280); margin-bottom: 1.25rem;">${escapeHTML(subtitle)}</p>` : ''}
      <div style="${containerStyle}">
    `;

    productsData.forEach(p => {
      const finalPrice =
        discountType === 'free-product' || discountType === 'free_product'
          ? 0
          : discountType === 'percentage'
            ? Math.max(0, p.origPrice * (1 - discountAmount / 100))
            : p.origPrice;
      
      const isSale = p.origPrice > finalPrice && finalPrice >= 0;
      const actualPrice = Math.max(0, finalPrice);

      const btnText = isAr ? 'إضافة للسلة' : 'Add to Cart';
      const checkboxHtml = `<input type="checkbox" class="salla-addon-cb" value="${p.id}" data-url="${escapeHTML(p.url)}" ${p.isPreselected ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; flex-shrink: 0; accent-color: ${colors.badgeBg || '#004b40'};" />`;

      if (displayOrientation === 'vertical') {
        html += `
          <div style="border-radius: ${radius}px; border: 1px solid ${colors.cardBorder || '#e2e8f0'}; overflow: hidden; background: #ffffff; display: flex; align-items: center; gap: 12px; padding: 10px; width: 100%; box-sizing: border-box;">
            <a href="${escapeHTML(p.url)}" style="text-decoration: none; color: inherit; display: block; flex-shrink: 0; width: 80px; aspect-ratio: 3/4; border-radius: ${Math.max(4, radius - 4)}px; overflow: hidden; position: relative; border: 1px solid ${colors.cardBorder || '#e2e8f0'}; background: #f1f5f9;">
              ${isSale ? `<span style="position: absolute; top: 4px; inset-inline-start: 4px; z-index: 2; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; color: #fff; background: #ef4444;">${isAr ? 'خصم' : 'Sale'}</span>` : ''}
              ${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="display: flex; height: 100%; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">...</div>`}
            </a>
            <div style="display: flex; flex-direction: column; justify-content: space-between; flex: 1; min-width: 0; align-self: stretch; padding: 2px 0;">
              <div>
                <label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer; margin-bottom: 4px;">
                  ${checkboxHtml}
                  <div style="font-size: 12px; font-weight: 600; color: ${colors.bodyText || '#0f172a'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(p.name)}">
                    ${escapeHTML(p.name)}
                  </div>
                </label>
                <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px;">
                  <span style="font-size: 13px; font-weight: 700; color: ${colors.badgeBg || colors.bodyText || '#16a34a'};">
                    ${formatPrice(actualPrice)}
                  </span>
                  ${isSale ? `<span style="font-size: 10px; text-decoration: line-through; color: #94a3b8;">${formatPrice(p.origPrice)}</span>` : ''}
                </div>
              </div>
              <div>
                <button type="button" class="salla-addon-add-btn" data-id="${p.id}" style="width: 100%; padding: 4px 8px; border: none; border-radius: ${Math.max(4, radius - 4)}px; background: ${colors.badgeBg || '#004b40'}; color: ${colors.badgeText || '#ffffff'}; font-size: 11px; font-weight: 600; cursor: pointer; min-height: 28px;">
                  ${btnText}
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        html += `
          <div style="border-radius: ${radius}px; border: 1px solid ${colors.cardBorder || '#e2e8f0'}; overflow: hidden; background: #ffffff; display: flex; flex-direction: column; flex-shrink: 0; width: 170px;">
            <a href="${escapeHTML(p.url)}" style="text-decoration: none; color: inherit; display: block; flex-grow: 1;">
              <div style="position: relative; aspect-ratio: 3/4; border-bottom: 1px solid ${colors.cardBorder || '#e2e8f0'}; background: #f1f5f9; border-top-left-radius: ${radius}px; border-top-right-radius: ${radius}px; overflow: hidden;">
                ${isSale ? `<span style="position: absolute; top: 6px; inset-inline-start: 6px; z-index: 2; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #fff; background: #ef4444;">${isAr ? 'خصم' : 'Sale'}</span>` : ''}
                ${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="display: flex; height: 100%; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">...</div>`}
              </div>
              <div style="padding: 8px;">
                <label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer; margin-bottom: 4px;">
                  ${checkboxHtml}
                  <div style="font-size: 11px; font-weight: 600; color: ${colors.bodyText || '#0f172a'}; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${escapeHTML(p.name)}">
                    ${escapeHTML(p.name)}
                  </div>
                </label>
                <div style="font-size: 11px; font-weight: 700; color: ${colors.savings || colors.bodyText || '#16a34a'}; margin-bottom: 2px;">
                  ${formatPrice(actualPrice)}
                </div>
                ${isSale ? `<div style="font-size: 9px; text-decoration: line-through; color: #94a3b8; margin-bottom: 6px;">${formatPrice(p.origPrice)}</div>` : '<div style="height: 13.5px; margin-bottom: 6px;"></div>'}
              </div>
            </a>
            <div style="padding: 0 8px 8px 8px;">
              <button type="button" class="salla-addon-add-btn" data-id="${p.id}" style="width: 100%; padding: 6px; border: none; border-radius: ${Math.max(4, radius - 4)}px; background: ${colors.badgeBg || '#004b40'}; color: ${colors.badgeText || '#ffffff'}; font-size: 11px; font-weight: 600; cursor: pointer; min-height: 32px;">
                ${btnText}
              </button>
            </div>
          </div>
        `;
      }
    });

    widget.innerHTML = html + `</div>`;

    const productsByIdMap = new Map(productsData.map(p => [String(p.id), p]));

    function resolveCartItem(payload) {
      if (typeof salla.cart.addItem === 'function') return salla.cart.addItem(payload);
      if (salla.cart.api && typeof salla.cart.api.addItem === 'function') return salla.cart.api.addItem(payload);
      return Promise.reject(new Error('salla.cart.addItem unavailable'));
    }

    async function addItemWithDefaultOptions(productId, quantity) {
      const product = productsByIdMap.get(String(productId));
      const options = product?.options || [];
      const payload = { id: productId, quantity: quantity || 1 };
      
      // Auto-select required options
      if (options.length) {
        const selectedOptions = {};
        for (const opt of options) {
          if (!opt.required) continue;
          const firstAvail = (opt.details || []).find(d => !d.is_out);
          if (firstAvail) selectedOptions[opt.id] = firstAvail.id;
        }
        if (Object.keys(selectedOptions).length) payload.options = selectedOptions;
      }
      return resolveCartItem(payload);
    }

    widget.querySelectorAll('.salla-addon-add-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.disabled = true;
        btn.style.opacity = '0.7';
        try {
          await addItemWithDefaultOptions(btn.getAttribute('data-id'), 1);
          if (salla.notify) salla.notify.success(isAr ? 'تمت الإضافة للسلة' : 'Added to cart');
        } catch (err) {
          console.warn('[AddonOffer] addItem failed:', err);
             if (salla.notify) salla.notify.error(isAr ? 'فشل الإضافة للسلة' : 'Failed to add to cart');
        } finally {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      });
    });

    return widget;
  }

  try {
    let categoryIds = [];

    if (productId && salla?.product?.getDetails) {
      try {
        const response = await salla.product.getDetails(productId, ["category"]);
        const catData = response.data?.category || response.data?.categories;
        if (catData) {
          if (Array.isArray(catData)) {
            categoryIds = catData.map(c => c.id).filter(Boolean);
          } else if (catData.id) {
            categoryIds.push(catData.id);
          }
        }
      } catch (err) {
        console.warn("[AddOns Offer] Failed to fetch category details");
      }
    }

    const catQuery = categoryIds.length > 0 ? `&categoryIds=${categoryIds.join(',')}` : '';
    const res = await fetch(`${API_BASE}/offers/storefront/${merchantId}?productId=${productId}${catQuery}`);
    if (!res.ok) return;

    const offers = await res.json();

    const addonOffers = offers.filter(o => o.kind === "product_add_on");
    if (!addonOffers.length) return;

    const root = document.createElement("div");
    root.id = "custom-addon-widgets-root";

    for (let i = 0; i < addonOffers.length; i++) {
      try {
        const widgetEl = await buildOfferWidget(addonOffers[i], i);
        if (widgetEl) root.appendChild(widgetEl);
      } catch (err) {
        console.warn("[AddonOffer] Failed to build widget for offer:", addonOffers[i]?.id, err);
      }
    }

    if (!root.children.length) return;

    const targetAnchor = document.querySelector("form#product-form") || document.querySelector(".product-form") || document.querySelector("div.options");
    if (targetAnchor) {
      targetAnchor.insertAdjacentElement("beforebegin", root);
    } else {
      document.body.appendChild(root);
    }

  } catch (err) {
    console.error("[AddonOffer] Failed to initialize:", err);
  }
});

// Auto-sync checked add-ons when the MAIN product is added to cart via Salla's native button
salla.event.on("cart::item-added", async (res) => {
  const mainProductId = salla.config.get("page.id");
  const addedProductId = res.data?.product_id;

  if (String(addedProductId) !== String(mainProductId)) return;

  const checkedBoxes = document.querySelectorAll('.salla-addon-cb:checked');
    for (const cb of checkedBoxes) {
    const id = cb.value;
    try {
      let payload = { id, quantity: 1 };
      try {
        const pRes = await salla.product.getDetails(id, ['options']);
        const opts = pRes?.data?.options || [];
        const selectedOptions = {};
        for (const opt of opts) {
          if (!opt.required) continue;
          const firstAvail = (opt.details || []).find(d => !d.is_out);
          if (firstAvail) selectedOptions[opt.id] = firstAvail.id;
        }
        if (Object.keys(selectedOptions).length) payload.options = selectedOptions;
      } catch (_) { /* best-effort */ }
      if (typeof salla.cart.addItem === 'function') await salla.cart.addItem(payload);
      else if (salla.cart.api?.addItem) await salla.cart.api.addItem(payload);
    } catch (e) {
      console.warn('[AddonOffer] Failed to auto-add checked addon:', id, e);
    }
  }
});