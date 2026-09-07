/**
 * Storefront Bundle Offer Embed Script for Salla Product Pages
 */
salla.onReady(async () => {
  // Prevent duplicate initialization
  if (window.__BUNDLE_OFFER_EMBED_LOADED__) return;
  window.__BUNDLE_OFFER_EMBED_LOADED__ = true;

  // Prevent duplicate injections on SPA navigation
  if (document.getElementById("custom-bundle-widgets-root")) return;

  const productId = salla.config.get("page.id") || salla.config.get("product.id");
  const merchantId = salla.config.get("store.id");

  if (!merchantId || !productId) return;

  const langConfig = salla.config.get("user.language");
  const isAr = langConfig ? langConfig.startsWith("ar") : true;

  const API_BASE = "https://backend-dev.cartbundles.com/api/v1";
  const currency = salla.config.get("store.currency") || (isAr ? "ر.س" : "SAR");

  const formatPrice = (price) => `<bdi>${parseFloat(price).toFixed(2)} ${currency}</bdi>`;
  const escapeHTML = (str) =>
    str
      ? String(str).replace(
          /[&<>'"]/g,
          (t) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              "'": "&#39;",
              '"': "&quot;",
            }[t])
        )
      : "";

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

  // Calculate discounted total for bundle
  function calculateBundlePricing(mainProduct, items, discountType, discountAmount) {
    const activeItems = items.filter((item) => item.selected);
    const mainPrice = mainProduct ? mainProduct.price : 0;
    const itemsPriceSum = activeItems.reduce((acc, item) => acc + item.price, 0);
    const rawTotal = mainPrice + itemsPriceSum;

    let finalTotal = rawTotal;
    const amt = parseFloat(discountAmount || 0);

    if (discountType === "percentage" && amt > 0) {
      finalTotal = Math.max(0, rawTotal * (1 - amt / 100));
    } else if ((discountType === "fixed" || discountType === "amount") && amt > 0) {
      finalTotal = Math.max(0, rawTotal - amt);
    } else if (discountType === "free_product" || discountType === "free-product") {
      // Free product discount: discount equals sum of active bundle items
      finalTotal = Math.max(0, mainPrice);
    }

    const savings = Math.max(0, rawTotal - finalTotal);

    return {
      rawTotal,
      finalTotal,
      savings,
    };
  }

  // Build a single bundle offer widget
  async function buildBundleWidget(bundleOffer, index) {
    const relatedProducts = bundleOffer.relatedProducts || [];
    if (!relatedProducts.length) return null;

    const title = bundleOffer.title?.[isAr ? "ar" : "en"] || bundleOffer.title?.ar || "";
    const subtitle = bundleOffer.subtitle?.[isAr ? "ar" : "en"] || bundleOffer.subtitle?.ar || "";
    const settings = bundleOffer.bundleSettings || {};
    const discountType = settings.discountType || "percentage";
    const discountAmount = parseFloat(settings.discountAmount || 0);
    const redirectToCart = Boolean(bundleOffer.redirectToCartAfterAdd ?? settings.redirectToCartAfterAdd);

    // Fetch main product details + bundle items concurrently
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
    };

    const bundleItemsData = relatedProducts
      .map((item) => {
        const details = productMap.get(item.sallaProductId);
        if (!details) return null;
        return {
          ...details,
          isPreselected: item.isPreselected ?? true,
          selected: item.isPreselected ?? true,
        };
      })
      .filter(Boolean);

    if (!bundleItemsData.length) return null;

    const colors = bundleOffer.appearance?.colors || {};
    const radius = bundleOffer.appearance?.borderRadiusPx ?? 12;

    const cardContainer = document.createElement("div");
    cardContainer.className = "custom-bundle-widget";
    cardContainer.dataset.offerId = bundleOffer.id ?? index;
    cardContainer.setAttribute("dir", isAr ? "rtl" : "ltr");
    cardContainer.style.cssText = `
      margin: 2rem 0;
      padding: 18px;
      border-radius: ${radius}px;
      background-color: ${colors.cardBg || "#ffffff"};
      border: 1px solid ${colors.cardBorder || "#e2e8f0"};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      font-family: inherit;
      text-align: start;
    `;

    // Render HTML structure
    let html = `
      <div style="margin-bottom: 14px;">
        <h3 style="font-size: 1.15rem; font-weight: 700; color: ${colors.titleColor || "#1e293b"}; margin: 0 0 4px 0;">
          ${escapeHTML(title || (isAr ? "اشتري المجموعة ووفر" : "Buy Bundle & Save"))}
        </h3>
        ${subtitle ? `<p style="font-size: 0.85rem; color: #64748b; margin: 0;">${escapeHTML(subtitle)}</p>` : ""}
      </div>

      <div class="bundle-products-grid" style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px;">
        <!-- Main Product -->
        <div class="bundle-item-card" style="flex: 1; min-width: 130px; max-width: 160px; border: 1.5px solid ${colors.badgeBg || "#004d5b"}; border-radius: 8px; padding: 10px; background: #f8fafc; text-align: center;">
          <div style="position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
            <span style="position: absolute; top: 4px; inset-inline-start: 4px; background: ${colors.badgeBg || "#004d5b"}; color: ${colors.badgeText || "#ffffff"}; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; z-index: 2;">${isAr ? "الأساسي" : "Main"}</span>
            <img src="${mainProductData.image}" alt="${escapeHTML(mainProductData.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <div style="font-size: 0.8rem; font-weight: 600; color: #1e293b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em; line-height: 1.2; margin-bottom: 4px;">
            ${escapeHTML(mainProductData.name)}
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">${formatPrice(mainProductData.price)}</div>
        </div>
    `;

    bundleItemsData.forEach((item, idx) => {
      html += `
        <div style="font-size: 1.2rem; font-weight: 700; color: #94a3b8; align-self: center;">+</div>
        <div class="bundle-item-card" data-idx="${idx}" style="flex: 1; min-width: 130px; max-width: 160px; border: 1px solid ${colors.cardBorder || "#e2e8f0"}; border-radius: 8px; padding: 10px; background: #ffffff; text-align: center; transition: all 0.2s ease;">
          <div style="position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
            <input type="checkbox" class="bundle-item-cb" data-idx="${idx}" ${item.selected ? "checked" : ""} style="position: absolute; top: 6px; inset-inline-start: 6px; width: 18px; height: 18px; accent-color: ${colors.badgeBg || "#004d5b"}; cursor: pointer; z-index: 3;" />
            <img src="${item.image}" alt="${escapeHTML(item.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <div style="font-size: 0.8rem; font-weight: 600; color: #1e293b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em; line-height: 1.2; margin-bottom: 4px;">
            ${escapeHTML(item.name)}
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">${formatPrice(item.price)}</div>
        </div>
      `;
    });

    html += `
      </div>

      <!-- Bundle Summary Bar -->
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border-radius: 8px; background: ${colors.selectedTier || "#f0fdf4"}; border: 1px dashed ${colors.cardBorder || "#cbd5e1"};">
        <div>
          <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 2px;">${isAr ? "إجمالي الحزمة:" : "Bundle Total:"}</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span class="bundle-final-price" style="font-size: 1.25rem; font-weight: 800; color: #0f172a;"></span>
            <span class="bundle-raw-price" style="font-size: 0.85rem; text-decoration: line-through; color: #94a3b8;"></span>
            <span class="bundle-savings-badge" style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: ${colors.badgeBg || "#004d5b"}; color: ${colors.badgeText || "#ffffff"}; display: none;"></span>
          </div>
        </div>

        <button type="button" class="bundle-add-all-btn" style="padding: 10px 20px; border: none; border-radius: 6px; background: ${colors.badgeBg || "#004d5b"}; color: ${colors.badgeText || "#ffffff"}; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s ease;">
          ${isAr ? "إضافة المجموعة للسلة" : "Add Bundle to Cart"}
        </button>
      </div>
    `;

    cardContainer.innerHTML = html;

    const finalPriceEl = cardContainer.querySelector(".bundle-final-price");
    const rawPriceEl = cardContainer.querySelector(".bundle-raw-price");
    const savingsBadgeEl = cardContainer.querySelector(".bundle-savings-badge");
    const addAllBtn = cardContainer.querySelector(".bundle-add-all-btn");

    function resolveCartItem(payload) {
      if (typeof salla.cart.addItem === 'function') return salla.cart.addItem(payload);
      if (salla.cart.api?.addItem) return salla.cart.api.addItem(payload);
      return Promise.reject(new Error('salla.cart.addItem unavailable'));
    }

    async function addItemWithDefaultOptions(product, quantity) {
      const opts = product.options || [];
      const payload = { id: product.id, quantity: quantity || 1 };
      if (opts.length) {
        const selectedOptions = {};
        for (const opt of opts) {
          if (!opt.required) continue;
          const firstAvail = (opt.details || []).find(d => !d.is_out);
          if (firstAvail) selectedOptions[opt.id] = firstAvail.id;
        }
        if (Object.keys(selectedOptions).length) payload.options = selectedOptions;
      }
      return resolveCartItem(payload);
    }

    function updatePricingUI() {
      const pricing = calculateBundlePricing(mainProductData, bundleItemsData, discountType, discountAmount);

      if (finalPriceEl) finalPriceEl.innerHTML = formatPrice(pricing.finalTotal);

      if (rawPriceEl) {
        if (pricing.savings > 0) {
          rawPriceEl.innerHTML = formatPrice(pricing.rawTotal);
          rawPriceEl.style.display = "inline";
        } else {
          rawPriceEl.style.display = "none";
        }
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

    // Attach listeners to item checkboxes
    cardContainer.querySelectorAll(".bundle-item-cb").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (!isNaN(idx) && bundleItemsData[idx]) {
          bundleItemsData[idx].selected = e.target.checked;
          updatePricingUI();
        }
      });
    });

    // Handle "Add Bundle to Cart" button
    addAllBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      addAllBtn.disabled = true;
      addAllBtn.style.opacity = "0.7";

      try {
        // 1. Add main product with its options auto-selected
        await addItemWithDefaultOptions(mainProductData, 1);

        // 2. Add selected bundle products with options auto-selected
        const selectedItems = bundleItemsData.filter((i) => i.selected);
        for (const item of selectedItems) {
          try {
            await addItemWithDefaultOptions(item, 1);
          } catch (err) {
            console.warn(`[BundleOffer] Failed to add item ${item.id}:`, err);
          }
        }

        if (salla.notify) {
          salla.notify.success(isAr ? "تمت إضافة المجموعة إلى السلة بنجاح!" : "Bundle added to cart successfully!");
        }

        if (redirectToCart) {
          const cartUrl = (salla.url && salla.url.get("cart")) || "/cart";
          window.location.href = cartUrl;
        }
      } catch (err) {
        console.error("[BundleOffer] Error adding bundle to cart:", err);
        if (salla.notify) {
          salla.notify.error(isAr ? "فشل إضافة المجموعة للسلة" : "Failed to add bundle to cart");
        }
      } finally {
        addAllBtn.disabled = false;
        addAllBtn.style.opacity = "1";
      }
    });

    updatePricingUI();
    return cardContainer;
  }

  async function initBundleOffers() {
    try {
      const categoryIds = [];
      const catConfig = salla.config.get("page.category") || salla.config.get("product.category");
      if (catConfig) {
        if (Array.isArray(catConfig)) categoryIds.push(...catConfig.map((c) => c.id || c));
        else categoryIds.push(catConfig.id || catConfig);
      }

      const urlParams = new URLSearchParams();
      if (productId) urlParams.append("productId", productId);
      if (categoryIds.length) urlParams.append("categoryIds", categoryIds.join(","));

      const qs = urlParams.toString();
      const res = await fetch(`${API_BASE}/offers/storefront/${merchantId}${qs ? `?${qs}` : ""}`);
      if (!res.ok) return;

      const offers = await res.json();
      if (!Array.isArray(offers) || !offers.length) return;

      const bundleOffers = offers.filter((o) => o.kind === "bundle");
      if (!bundleOffers.length) return;

      const anchor = getTargetAnchor();
      if (!anchor) return;

      const rootContainer = document.createElement("div");
      rootContainer.id = "custom-bundle-widgets-root";

      for (let i = 0; i < bundleOffers.length; i++) {
        const widget = await buildBundleWidget(bundleOffers[i], i);
        if (widget) rootContainer.appendChild(widget);
      }

      if (rootContainer.hasChildNodes()) {
        anchor.insertAdjacentElement("beforebegin", rootContainer);
      }
    } catch (err) {
      console.error("[BundleOffer] Error initializing bundle offers:", err);
    }
  }

  initBundleOffers();
});
