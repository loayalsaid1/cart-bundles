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
  const API_BASE = "https://backend-dev.cartbundles.com/api/v1"; // TODO: Update for PROD
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
          const pRes = await salla.api.product.getDetails(item.sallaProductId);
          if (pRes?.data) {
            const d = pRes.data;
            let img = d.image?.url || d.main_image || d.thumbnail;
            if (typeof img === 'object' && img !== null) img = img.url;

            productsData.push({
              id: item.sallaProductId,
              name: d.name,
              image: img || "",
              price: parseFloat(d.price || 0),
              hasOptions: !!(d.has_options || (d.options && d.options.length > 0)),
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
        const btnText = p.hasOptions ? (isAr ? 'تحديد الخيارات' : 'Select Options') : (isAr ? 'إضافة للسلة' : 'Add to Cart');

        html += `
          <div style="border: 1px solid ${escapeHTML(colors.cardBorder || '#e5e7eb')}; border-radius: ${Math.max(0, radius - 4)}px; padding: 10px; background: var(--color-bg-surface, var(--color-background, #fff)); display: flex; flex-direction: column; transition: transform 0.2s;">
            <a href="${escapeHTML(p.url)}" style="text-decoration: none; color: inherit; display: block; flex-grow: 1;">
              <div style="position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; margin-bottom: 10px; background: var(--color-grey-100, #f3f4f6);">
                ${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" style="width: 100%; height: 100%; object-fit: cover;" />` : ''}
              </div>
              <div style="font-size: 12px; font-weight: 600; line-height: 1.4; color: var(--color-text, #111827); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.8em; margin-bottom: 8px;">
                ${escapeHTML(p.name)}
              </div>
              <div style="font-size: 14px; font-weight: bold; color: ${escapeHTML(colors.savings || 'var(--color-primary, #004d5a)')}; margin-bottom: 12px;">
                ${formatPrice(p.price)}
              </div>
            </a>
            <!-- Option Crash Protection Button -->
            <button type="button" class="btn btn--primary salla-rec-add-btn" data-id="${p.id}" data-has-options="${p.hasOptions}" data-url="${escapeHTML(p.url)}" style="width: 100%; padding: 6px; font-size: 12px; min-height: 32px; margin-top: auto; border-radius: 6px; background-color: ${escapeHTML(colors.badgeBg || 'var(--color-primary)')}; color: ${escapeHTML(colors.badgeText || '#fff')}; border: none; cursor: pointer;">
              ${btnText}
            </button>
          </div>
        `;
      });

      widget.innerHTML = html + `</div>`;

      // 8. Event Listeners for Add to Cart
      widget.querySelectorAll('.salla-rec-add-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const hasOptions = btn.getAttribute('data-has-options') === 'true';

          if (hasOptions) {
            // Options required: Redirect customer to product page
            window.open(btn.getAttribute('data-url'), '_blank');
          } else {
            try {
              btn.disabled = true;
              btn.style.opacity = "0.7";

              // Add item (Salla automatically triggers its native cart drawer update)
              await salla.cart.api.addItem({ id: btn.getAttribute('data-id'), quantity: 1 });

              btn.disabled = false;
              btn.style.opacity = "1";
            } catch (err) {
              console.error("[CartRecs] Error adding item", err);
              btn.disabled = false;
              btn.style.opacity = "1";
            }
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