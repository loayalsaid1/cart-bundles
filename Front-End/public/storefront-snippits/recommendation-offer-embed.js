/**
 * Storefront Cart Recommendation Embed Script for Salla
 * Injects related or general product recommendations into the cart page.
 */
salla.onReady(async () => {
  if (window.__RECOMMENDATION_OFFER_EMBED_LOADED__) { return; }
  window.__RECOMMENDATION_OFFER_EMBED_LOADED__ = true;

  // Ensure we only run this on the Cart page
  const pageRoute = salla.config.get("page.slug");
  if (pageRoute !== "cart") return;

  const merchantId = salla.config.get("store.id");
  if (!merchantId) return;

  const isAr = salla.config.get("user.language")?.startsWith("ar") ?? true;
  const API_BASE = "https://cart-bundles-demo-backend.vercel.app/api/v1"; // TODO: Update for PROD
  const currency = salla.config.get("store.currency") || (isAr ? "ر.س" : "SAR");

  const formatPrice = (price) => `<bdi>${parseFloat(price).toFixed(2)} ${currency}</bdi>`;
  const escapeHTML = (str) => str ? String(str).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t])) : '';

  try {
    // 2. Fetch Offers from your backend (Targeting all_products by default)
    const res = await fetch(`${API_BASE}/offers/storefront/${merchantId}`);
    if (!res.ok) return;

    const offers = await res.json();
    const recOffers = offers.filter(o => o.kind === "cart_recommendation");
    if (!recOffers.length) return;

    // 3. Fetch Cart Items using Twilight SDK (Crucial for 'cart_related' mode)
    let cartProductIds = [];
    try {
      const cartSummary = await salla.cart.details();
      cartProductIds = cartSummary.data.cart.items.map(item => item.product_id);
    } catch (err) {
      console.warn("[CartRecs] Failed to fetch cart summary", err);
    }

    // 4. Build Root Container
    const root = document.createElement("div");
    root.id = "custom-recommendations-root";
    root.style.cssText = "width: 100%; clear: both;";

    // 5. Process Each Recommendation Offer
    for (let i = 0; i < recOffers.length; i++) {
      const offer = recOffers[i];
      const settings = offer.recommendationSettings || {};
      const mode = settings.mode || 'general';

      // --- CART TRIGGER LOGIC ---
      // If mode is cart_related, ONLY show this widget if the trigger product is in the cart!
      if (mode === 'cart_related') {
        const triggerId = settings.triggerSallaProductId;
        if (!cartProductIds.includes(triggerId)) continue; // Skip to next offer
      }

      if (!offer.relatedProducts?.length) continue;

      // 6. Fetch Product Details (Name, Price, Options, Image)
      const productsData = [];
      for (const item of offer.relatedProducts) {
        try {
          const pRes = await salla.product.getDetails(item.sallaProductId, ["options"]);
          if (pRes?.data) {
            const d = pRes.data;
            let img = d.image?.url || d.main_image || d.thumbnail;
            if (typeof img === 'object' && img !== null) img = img.url;

            productsData.push({
              id: item.sallaProductId,
              name: d.name,
              image: img || "",
              price: parseFloat(d.price?.amount ?? d.price ?? 0),
              options: Array.isArray(d.options) ? d.options : [],
              url: d.url || '#'
            });
          }
        } catch (e) {
          console.warn("[CartRecs] Failed to load product:", item.sallaProductId);
        }
      }

      if (!productsData.length) continue;

      // 7. Build UI mimicking the React Builder Preview (Grid Layout)
      const title = offer.title?.[isAr ? 'ar' : 'en'] || offer.title?.ar || "";
      const subtitle = offer.subtitle?.[isAr ? 'ar' : 'en'] || offer.subtitle?.ar || "";
      const colors = offer.appearance?.colors || {};
      const radius = offer.appearance?.borderRadiusPx ?? 12;

      const widget = document.createElement("div");
      widget.className = "cart-recommendation-widget";
      widget.style.cssText = `margin: 2.5rem 0; padding: 18px; border-radius: ${radius}px; background-color: ${escapeHTML(colors.cardBg || "transparent")}; border: 1px solid ${escapeHTML(colors.cardBorder || "transparent")}; text-align: start; font-family: inherit;`;

      let html = `
        <div style="margin-bottom: 16px;">
          ${title ? `<h3 style="font-size: 1.15rem; font-weight: bold; color: var(--color-text, #1f2937); margin: 0 0 4px 0;">${escapeHTML(title)}</h3>` : ''}
          ${subtitle ? `<p style="font-size: 0.9rem; color: var(--color-grey-500, #6b7280); margin: 0;">${escapeHTML(subtitle)}</p>` : ''}
        </div>
        <!-- Grid Layout matching the frontend builder -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
      `;

      productsData.forEach(p => {
        const btnText = isAr ? 'إضافة للسلة' : 'Add to Cart';

        html += `
          <div style="border-radius: ${radius}px; border: 1px solid ${colors.cardBorder || '#e2e8f0'}; overflow: hidden; background: #ffffff;">
            <a href="${escapeHTML(p.url)}" style="text-decoration: none; color: inherit; display: block;">
              <div style="position: relative; aspect-ratio: 3/4; border-bottom: 1px solid ${colors.cardBorder || '#e2e8f0'}; background: #f1f5f9; border-top-left-radius: ${radius}px; border-top-right-radius: ${radius}px; overflow: hidden;">
                ${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="display: flex; height: 100%; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">...</div>`}
              </div>
              <div style="padding: 8px;">
                <div style="font-size: 11px; font-weight: 600; color: ${colors.bodyText || '#0f172a'}; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(p.name)}">
                  ${escapeHTML(p.name)}
                </div>
                <div style="font-size: 11px; font-weight: 700; color: ${colors.savings || colors.bodyText || '#16a34a'}; margin-bottom: 8px;">
                  ${formatPrice(p.price)}
                </div>
              </div>
            </a>
            <button type="button" class="salla-rec-add-btn" data-id="${p.id}" style="width: 100%; padding: 6px; border: none; border-radius: ${radius}px; background: ${colors.badgeBg || '#004b40'}; color: ${colors.badgeText || '#ffffff'}; font-size: 11px; font-weight: 600; cursor: pointer;">
              ${btnText}
            </button>
          </div>
        `;
      });

      widget.innerHTML = html + `</div>`;

      // 8. Event Listeners for Add to Cart
      const productsByIdMap = new Map(productsData.map(p => [String(p.id), p]));

      async function addItemWithDefaultOptions(productId, quantity) {
        const product = productsByIdMap.get(String(productId));
        const opts = product?.options || [];
        const payload = { id: productId, quantity: quantity || 1 };
        if (opts.length) {
          const selectedOptions = {};
          for (const opt of opts) {
            if (!opt.required) continue;
            const firstAvail = (opt.details || []).find(d => !d.is_out);
            if (firstAvail) selectedOptions[opt.id] = firstAvail.id;
          }
          if (Object.keys(selectedOptions).length) payload.options = selectedOptions;
        }
        if (typeof salla.cart.addItem === 'function') return salla.cart.addItem(payload);
        if (salla.cart.api?.addItem) return salla.cart.api.addItem(payload);
        throw new Error('salla.cart.addItem unavailable');
      }

      widget.querySelectorAll('.salla-rec-add-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          btn.disabled = true;
          btn.style.opacity = "0.7";
          try {
            await addItemWithDefaultOptions(btn.getAttribute('data-id'), 1);
            if (salla.notify) salla.notify.success(isAr ? 'تمت الإضافة للسلة' : 'Added to cart');
          } catch (err) {
            console.error("[CartRecs] Error adding item", err);
            if (salla.notify) salla.notify.error(isAr ? 'فشل الإضافة' : 'Failed to add');
          } finally {
            btn.disabled = false;
            btn.style.opacity = "1";
          }
        });
      });

      root.appendChild(widget);
    }

    if (!root.hasChildNodes()) return;

    // 9. Target the requested DOM selector
    const targetAnchor = document.querySelector("div > .main-content, div > #main-content");

    if (targetAnchor) {
      // Append to the bottom of the main content area in the cart
      targetAnchor.appendChild(root);
    } else {
      // Fallback
      document.body.appendChild(root);
    }

  } catch (err) {
    console.error("[CartRecs] Failed to initialize:", err);
  }
});