/**
 * Cart Recommendation Embed — CartBundles
 *
 * Cart page ONLY (page.slug === "cart").
 * Makes its own independent API fetch (no productId, different context from product-page scripts).
 * Reads shared utilities from window.__CBCore when available, falls back to inline if not.
 */
salla.onReady(async () => {
  if (window.__RECOMMENDATION_OFFER_EMBED_LOADED__) return;
  window.__RECOMMENDATION_OFFER_EMBED_LOADED__ = true;

  // Only run on the cart page
  const pageRoute = salla.config.get("page.slug");
  if (pageRoute !== "cart") return;

  const merchantId = salla.config.get("store.id");
  if (!merchantId) return;

  // Use shared core if available, otherwise inline fallbacks
  const core = window.__CBCore || {};
  const isAr = core.isAr ?? (salla.config.get("user.language")?.startsWith("ar") ?? true);
  const currency = core.currency ?? (salla.config.get("store.currency") || (isAr ? "ر.س" : "SAR"));
  const API_BASE = core.API_BASE ?? "https://backend-dev.cartbundles.com/api/v1";

  const escapeHTML =
    core.escapeHTML ??
    ((str) =>
      str
        ? String(str).replace(/[&<>'"]/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[t]))
        : "");

  const formatPrice =
    core.formatPrice ??
    ((price) => `<bdi>${(parseFloat(price) || 0).toFixed(2)} ${currency}</bdi>`);

  try {
    const res = await fetch(`${API_BASE}/offers/storefront/${merchantId}`);
    if (!res.ok) return;

    const offers = await res.json();
    const recOffers = offers.filter((o) => o.kind === "cart_recommendation");
    if (!recOffers.length) return;

    // Fetch cart items for cart_related mode trigger check
    let cartProductIds = [];
    try {
      const cartSummary = await salla.cart.details();
      cartProductIds = cartSummary.data.cart.items.map((item) => item.product_id);
    } catch (err) {
      console.warn("[CartRecs] Failed to fetch cart summary", err);
    }

    const root = document.createElement("div");
    root.id = "custom-recommendations-root";
    root.style.cssText = "width: 100%; clear: both;";

    for (let i = 0; i < recOffers.length; i++) {
      const offer = recOffers[i];
      const settings = offer.recommendationSettings || {};
      const mode = settings.mode || "general";

      // cart_related: only show if trigger product is in the cart
      if (mode === "cart_related") {
        const triggerId = settings.triggerSallaProductId;
        if (!cartProductIds.includes(triggerId)) continue;
      }

      if (!offer.relatedProducts?.length) continue;

      // Fetch all related products in parallel
      const productResults = await Promise.allSettled(
        offer.relatedProducts.map((item) =>
          salla.product.getDetails(item.sallaProductId, ["options"]).then((pRes) => ({ item, pRes }))
        )
      );

      const productsData = [];
      for (const result of productResults) {
        if (result.status !== "fulfilled" || !result.value.pRes?.data) {
          if (result.status === "rejected") console.warn("[CartRecs] Failed to load product:", result.reason);
          continue;
        }
        const { item, pRes } = result.value;
        const d = pRes.data;
        let img = d.image?.url || d.main_image || d.thumbnail;
        if (typeof img === "object" && img !== null) img = img.url;
        productsData.push({
          id: item.sallaProductId,
          name: d.name,
          image: img || "",
          price: parseFloat(d.price?.amount ?? d.price ?? 0),
          options: Array.isArray(d.options) ? d.options : [],
          url: d.url || "#",
        });
      }

      if (!productsData.length) continue;

      const title = offer.title?.[isAr ? "ar" : "en"] || offer.title?.ar || "";
      const subtitle = offer.subtitle?.[isAr ? "ar" : "en"] || offer.subtitle?.ar || "";
      const colors = offer.appearance?.colors || {};
      const radius = offer.appearance?.borderRadiusPx ?? 12;
      const core = window.__CBCore;
      const align = (core && core.headingAlign && core.headingAlign(offer.appearance)) || "start";
      const cardCss =
        (core && core.appearanceCardCss && core.appearanceCardCss(offer.appearance, "margin: 2.5rem 0; padding: 18px;")) ||
        `margin: 2.5rem 0; padding: 18px; border-radius: ${radius}px; background-color: ${escapeHTML(colors.cardBg || "transparent")}; border: 1px solid ${escapeHTML(colors.cardBorder || "transparent")}; font-family: inherit;`;

      const widget = document.createElement("div");
      widget.className = "cart-recommendation-widget";
      widget.style.cssText = cardCss;

      const btnText = isAr ? "إضافة للسلة" : "Add to Cart";

      let html = `
        <div style="margin-bottom: 16px; text-align: ${align};">
          ${title ? `<h3 style="font-size: 1.15rem; font-weight: bold; color: var(--color-text, #1f2937); margin: 0 0 4px 0;">${escapeHTML(title)}</h3>` : ""}
          ${subtitle ? `<p style="font-size: 0.9rem; color: var(--color-grey-500, #6b7280); margin: 0;">${escapeHTML(subtitle)}</p>` : ""}
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
      `;

      productsData.forEach((p) => {
        html += `
          <div style="border-radius: ${radius}px; border: 1px solid ${colors.cardBorder || "#e2e8f0"}; overflow: hidden; background: #ffffff;">
            <a href="${escapeHTML(p.url)}" style="text-decoration: none; color: inherit; display: block;">
              <div style="position: relative; aspect-ratio: 3/4; border-bottom: 1px solid ${colors.cardBorder || "#e2e8f0"}; background: #f1f5f9; border-top-left-radius: ${radius}px; border-top-right-radius: ${radius}px; overflow: hidden;">
                ${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;" />` : `<div style="display: flex; height: 100%; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">...</div>`}
              </div>
              <div style="padding: 8px;">
                <div style="font-size: 11px; font-weight: 600; color: ${colors.bodyText || "#0f172a"}; margin-bottom: 0px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</div>
                <div style="font-size: 11px; font-weight: 700; color: ${colors.savings || colors.bodyText || "#16a34a"}; margin-bottom: 8px;">${formatPrice(p.price)}</div>
                <button type="button" class="salla-rec-add-btn" data-id="${p.id}" style="width: 100%; padding: 6px; border: none; border-radius: ${radius}px; background: ${colors.badgeBg || "#004b40"}; color: ${colors.badgeText || "#ffffff"}; font-size: 11px; font-weight: 600; cursor: pointer;">${btnText}</button>
              </div>
            </a>
          </div>
        `;
      });

      widget.innerHTML = html + "</div>";

      // Build id→product map for click handlers
      const productsByIdMap = new Map(productsData.map((p) => [String(p.id), p]));

      widget.querySelectorAll(".salla-rec-add-btn").forEach((btn) => {
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
                productId: Number(btn.getAttribute("data-id")),
                source: "recommendation",
              });
            }
            const product = productsByIdMap.get(btn.getAttribute("data-id"));
            if (!product) throw new Error("Product not found in map");

            const payload = { id: product.id, quantity: 1 };
            const opts = product.options || [];
            if (opts.length) {
              const selectedOptions = {};
              for (const opt of opts) {
                if (!opt.required) continue;
                const firstAvail = (opt.details || []).find((d) => !d.is_out);
                if (firstAvail) selectedOptions[opt.id] = firstAvail.id;
              }
              if (Object.keys(selectedOptions).length) payload.options = selectedOptions;
            }

            if (typeof salla.cart.addItem === "function") await salla.cart.addItem(payload);
            else if (salla.cart.api?.addItem) await salla.cart.api.addItem(payload);
            else throw new Error("salla.cart.addItem unavailable");

            if (window.__CART_BUNDLES_TRACK__ && offer.id) {
              window.__CART_BUNDLES_TRACK__({
                merchantId: Number(merchantId),
                offerId: Number(offer.id),
                event: "offer.add_to_cart",
                productId: Number(btn.getAttribute("data-id")),
                source: "recommendation",
              });
            }
            if (salla.notify) salla.notify.success(isAr ? "تمت الإضافة للسلة" : "Added to cart");
          } catch (err) {
            console.error("[CartRecs] Error adding item", err);
            if (salla.notify) salla.notify.error(isAr ? "فشل الإضافة" : "Failed to add");
          } finally {
            btn.disabled = false;
            btn.style.opacity = "1";
          }
        });
      });

      root.appendChild(widget);
      if (window.__CART_BUNDLES_TRACK__ && offer.id) {
        window.__CART_BUNDLES_TRACK__({
          merchantId: Number(merchantId),
          offerId: Number(offer.id),
          event: "offer.impression",
          source: "recommendation",
        });
      }
    }

    if (!root.hasChildNodes()) return;

    const targetAnchor = document.querySelector("div > .main-content, div > #main-content");
    if (targetAnchor) {
      targetAnchor.appendChild(root);
    } else {
      document.body.appendChild(root);
    }
  } catch (err) {
    console.error("[CartRecs] Failed to initialize:", err);
  }
});