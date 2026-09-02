salla.onReady(async () => {
  // Prevent duplicate initialization
  if (window.__ADDON_OFFER_EMBED_LOADED__) return;
  window.__ADDON_OFFER_EMBED_LOADED__ = true;

  // Prevent duplicate injections on SPA navigation (guard on a wrapper, not a per-offer id)
  if (document.getElementById('custom-addon-widgets-root')) return;

  const productId = salla.config.get("page.id") || salla.config.get("product.id");
  const merchantId = salla.config.get("store.id");

  // FIX: previous `|| true` forced isAr to always be true regardless of language
  const langConfig = salla.config.get("user.language");
  const isAr = langConfig ? langConfig.startsWith("ar") : true; // default ar only if language is unknown

  const API_BASE = "https://cart-bundles-demo-backend.vercel.app/api/v1"; // TODO: Update for PROD
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

    // FIX: fetch related products in parallel instead of sequentially
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

      // FIX: use the safely-extracted img, don't re-read data.image.url directly (was throwing on missing images)
      let img = data.main_image || data.image || data.thumbnail || (data.images && data.images[0]?.url);
      if (typeof img === 'object' && img !== null) img = img.url;

      productsData.push({
        id: item.sallaProductId,
        isPreselected: item.isPreselected,
        name: data.name,
        image: img || "",
        origPrice: parseFloat(data.price?.amount ?? data.price ?? 0),
        hasOptions: !!data.options,
        url: data.url || data.urls?.customer || '#',
      });
    }

    if (!productsData.length) return null;

    const widget = document.createElement("div");
    widget.className = "custom-addon-widget";
    widget.dataset.offerId = addonOffer.id ?? index;
    widget.style.cssText = `margin: 2.5rem 0; text-align: start; font-family: inherit;`;

    let html = `
      <h3 style="font-size: 1.15rem; font-weight: bold; color: var(--color-text, #1f2937); margin-bottom: 0.25rem;">${escapeHTML(title)}</h3>
      ${subtitle ? `<p style="font-size: 0.9rem; color: var(--color-grey-500, #6b7280); margin-bottom: 1.25rem;">${escapeHTML(subtitle)}</p>` : ''}
      <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none;">
    `;

    productsData.forEach(p => {
      const finalPrice = discountType === 'percentage'
        ? p.origPrice - (p.origPrice * (discountAmount / 100))
        : p.origPrice - discountAmount;
      const isSale = p.origPrice > finalPrice && finalPrice >= 0;
      const actualPrice = Math.max(0, finalPrice);

      const btnText = p.hasOptions ? (isAr ? 'اختيار الخيارات' : 'Select Options') : (isAr ? 'إضافة للسلة' : 'Add to Cart');
      const checkboxHtml = p.hasOptions
        ? `<span style="width: 16px; height: 16px; flex-shrink: 0;"></span>`
        : `<input type="checkbox" class="salla-addon-cb" value="${p.id}" ${p.isPreselected ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; flex-shrink: 0; accent-color: var(--color-primary);" />`;

      html += `
      <a href="${p.url}" style="text-decoration: none; color: inherit;">
        <div style="min-width: 150px; max-width: 170px; flex-shrink: 0; border: 1px solid var(--color-border, #e5e7eb); border-radius: 8px; padding: 10px; background: var(--color-bg-surface, var(--color-background, #fff)); display: flex; flex-direction: column;">

          <div style="position: relative; aspect-ratio: 3/4; border-radius: 6px; overflow: hidden; margin-bottom: 12px; background: var(--color-grey-100, #f3f4f6);">
            ${isSale ? `<span style="position: absolute; top: 6px; inset-inline-start: 6px; background: var(--color-danger, #ef4444); color: #fff; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; z-index: 2;">${isAr ? 'خصم' : 'Sale'}</span>` : ''}
            <img src="${p.image}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>

          <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin-bottom: 12px;">
            ${checkboxHtml}
            <span style="font-size: 12px; font-weight: 600; line-height: 1.4; color: var(--color-text, #111827); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${escapeHTML(p.name)}
            </span>
          </label>

          <div style="display: flex; flex-direction: column; gap: 2px; margin-top: auto; margin-bottom: 12px;">
             <span style="font-size: 14px; font-weight: bold; color: var(--color-primary, #004d5a);">${formatPrice(actualPrice)}</span>
             ${isSale ? `<span style="font-size: 11px; text-decoration: line-through; color: var(--color-grey-400, #9ca3af);">${formatPrice(p.origPrice)}</span>` : '<span style="height: 16px;"></span>'}
          </div>

          <button type="button" class="btn btn--primary salla-addon-add-btn" data-id="${p.id}" data-has-options="${p.hasOptions}" data-url="${escapeHTML(p.url)}" style="width: 100%; padding: 6px; font-size: 12px; min-height: 32px;">
            ${btnText}
          </button>
        </div>
      </a>
      `;
    });

    widget.innerHTML = html + `</div>`;

    widget.querySelectorAll('.salla-addon-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const hasOptions = btn.getAttribute('data-has-options') === 'true';
        if (hasOptions) {
          window.open(btn.getAttribute('data-url'), '_blank');
        } else {
          salla.cart.api.addItem({ id: btn.getAttribute('data-id'), quantity: 1 });
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

    // FIX: render ALL matching offers, not just the first one
    const addonOffers = offers.filter(o => o.kind === "product_add_on");
    if (!addonOffers.length) return;

    const root = document.createElement("div");
    root.id = "custom-addon-widgets-root";

    // Build each offer's widget independently so one bad offer can't take down the rest
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

// Auto-sync checked add-ons (across ALL rendered offer widgets) when the MAIN product is added to cart
salla.event.on("cart::item-added", async (res) => {
  const mainProductId = salla.config.get("page.id");
  const addedProductId = res.data?.product_id;

  if (String(addedProductId) !== String(mainProductId)) return;

  const checkedBoxes = document.querySelectorAll('.salla-addon-cb:checked');
  for (const cb of checkedBoxes) {
    try {
      await salla.cart.api.addItem({ id: cb.value, quantity: 1 });
    } catch (e) {
      console.warn("Failed to add addon:", cb.value);
    }
  }
});