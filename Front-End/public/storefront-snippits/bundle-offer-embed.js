/**
 * Storefront Bundle Offer Embed Script for Salla Product Pages
 * Paste as a single snippet. Discounts apply to related (GET) products only.
 */
salla.onReady(async () => {
  if (window.__BUNDLE_OFFER_EMBED_LOADED__) return;
  window.__BUNDLE_OFFER_EMBED_LOADED__ = true;
  if (document.getElementById("custom-bundle-widgets-root")) return;

  const productId = salla.config.get("page.id") || salla.config.get("product.id");
  const merchantId = salla.config.get("store.id");
  if (!merchantId || !productId) return;

  const langConfig = salla.config.get("user.language");
  const isAr = langConfig ? langConfig.startsWith("ar") : true;
  const API_BASE = "https://backend-dev.cartbundles.com/api/v1";
  const currency = salla.config.get("store.currency") || (isAr ? "ر.س" : "SAR");
  const OPTION_NAME_RE = /(?:product_)?options\[(\d+)\]/;

  const formatPrice = (price) =>
    `<bdi>${(parseFloat(price) || 0).toFixed(2)} ${currency}</bdi>`;
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
            })[t],
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

  function getProductForm() {
    return (
      document.querySelector("form#product-form") ||
      document.querySelector("form.product-form") ||
      document.getElementById("product-form") ||
      document.querySelector(".product-form")
    );
  }

  function collectFormOptions(form) {
    const options = {};
    if (!form) return options;
    const assign = (optionId, value) => {
      if (value === undefined || value === null || value === "") return;
      if (Object.prototype.hasOwnProperty.call(options, optionId)) {
        const prev = options[optionId];
        options[optionId] = Array.isArray(prev) ? prev.concat(value) : [prev, value];
      } else {
        options[optionId] = value;
      }
    };
    if (typeof FormData === "function") {
      new FormData(form).forEach((value, key) => {
        const match = key.match(OPTION_NAME_RE);
        if (match) assign(match[1], value);
      });
    }
    form
      .querySelectorAll(
        "[name^='options['], [name^='product_options['], salla-product-options input, salla-product-options select",
      )
      .forEach((el) => {
        const name = el.getAttribute("name") || "";
        const match = name.match(OPTION_NAME_RE);
        if (!match) return;
        if (el.type === "radio" || el.type === "checkbox") {
          if (el.checked) assign(match[1], el.value);
        } else if (!el.disabled) {
          assign(match[1], el.value);
        }
      });
    return options;
  }

  function getCartAdder() {
    if (!salla.cart) return null;
    if (typeof salla.cart.addItem === "function") return (p) => salla.cart.addItem(p);
    if (salla.cart.api && typeof salla.cart.api.addItem === "function") {
      return (p) => salla.cart.api.addItem(p);
    }
    return null;
  }

  /**
   * Native theme ATC works because the product form already has options.
   * Embeds must reuse that form for the current product; other optioned
   * products cannot be added blindly.
   */
  async function addProductToCart({ id, quantity = 1, needsOptions, isCurrentProduct, url }) {
    const add = getCartAdder();
    if (!id) throw new Error("Missing product id");

    if (!isCurrentProduct && needsOptions) {
      if (salla.notify) {
        salla.notify.error(
          isAr
            ? "هذا المنتج يتطلب اختيار خيارات أولاً"
            : "This product requires options — open it to choose them",
        );
      }
      window.open(url || `/p/${id}`, "_blank");
      return { skipped: true };
    }

    if (!add) throw new Error("salla.cart.addItem unavailable");

    const payload = { id, quantity };
    if (isCurrentProduct) {
      const form = getProductForm();
      const options = collectFormOptions(form);
      const qtyInput =
        (form && form.querySelector('input[name="quantity"]')) ||
        document.querySelector('input[name="quantity"]');
      const sallaQty = document.querySelector("salla-quantity-input");
      payload.quantity = Number(
        (qtyInput && qtyInput.value) ||
          (sallaQty && (sallaQty.value || sallaQty.getAttribute("value"))) ||
          quantity,
      ) || 1;
      if (Object.keys(options).length) payload.options = options;
    }

    try {
      return await add(payload);
    } catch (err) {
      const text = err && (err.message || err.msg || String(err));
      if (/option/i.test(text || "") && /required|يجب|خيار/i.test(text || "")) {
        if (isCurrentProduct && salla.notify) {
          salla.notify.error(
            isAr ? "يرجى اختيار خيارات المنتج أولاً" : "Please select product options first",
          );
        } else {
          window.open(url || `/p/${id}`, "_blank");
        }
      }
      throw err;
    }
  }

  function applyRelatedDiscount(price, discountType, discountAmount) {
    const p = parseFloat(price) || 0;
    if (!discountType) return p;
    if (discountType === "free-product" || discountType === "free_product") return 0;
    if (discountType === "percentage") {
      const amt = parseFloat(discountAmount) || 0;
      return Math.max(0, p * (1 - amt / 100));
    }
    return p;
  }

  function calculateBundleTotals(mainPrice, relatedItems, discountType, discountAmount) {
    const active = relatedItems.filter((item) => item.selected);
    const relatedRaw = active.reduce((acc, item) => acc + (parseFloat(item.price) || 0), 0);
    const relatedFinal = active.reduce(
      (acc, item) => acc + applyRelatedDiscount(item.price, discountType, discountAmount),
      0,
    );
    const main = parseFloat(mainPrice) || 0;
    const rawTotal = main + relatedRaw;
    const finalTotal = main + relatedFinal;
    return { rawTotal, finalTotal, savings: Math.max(0, rawTotal - finalTotal) };
  }

  async function buildBundleWidget(bundleOffer, index) {
    const relatedProducts = bundleOffer.relatedProducts || [];
    if (!relatedProducts.length) return null;

    const title =
      bundleOffer.title?.[isAr ? "ar" : "en"] || bundleOffer.title?.ar || "";
    const subtitle =
      bundleOffer.subtitle?.[isAr ? "ar" : "en"] || bundleOffer.subtitle?.ar || "";
    const settings = bundleOffer.bundleSettings || {};
    const discountType = settings.discountType || null;
    const discountAmount = parseFloat(settings.discountAmount || 0);
    const redirectToCart = Boolean(
      bundleOffer.redirectToCartAfterAdd ?? settings.redirectToCartAfterAdd,
    );

    const allProductIds = [productId, ...relatedProducts.map((p) => p.sallaProductId)];
    const productResults = await Promise.allSettled(
      allProductIds.map((id) =>
        salla.product.getDetails(id, ["options"]).then((res) => ({ id, res })),
      ),
    );

    const productMap = new Map();
    for (const res of productResults) {
      if (res.status === "fulfilled" && res.value.res?.data) {
        const d = res.value.res.data;
        let img = d.main_image || d.image || d.thumbnail || (d.images && d.images[0]?.url);
        if (typeof img === "object" && img !== null) img = img.url;
        const options = Array.isArray(d.options) ? d.options : [];
        productMap.set(res.value.id, {
          id: d.id,
          name: d.name || "",
          price: parseFloat(d.price?.amount ?? d.price ?? 0),
          image: img || "",
          url: d.url || d.urls?.customer || "",
          needsOptions: options.length > 0,
        });
      }
    }

    const mainProductData = productMap.get(productId) || {
      id: productId,
      name: isAr ? "المنتج الحالي" : "Current Product",
      price: 0,
      image: "",
      url: "",
      needsOptions: false,
    };

    const bundleItemsData = relatedProducts
      .map((item) => {
        const details = productMap.get(item.sallaProductId);
        if (!details) return null;
        return {
          ...details,
          selected: item.isPreselected ?? true,
        };
      })
      .filter(Boolean);

    if (!bundleItemsData.length) return null;

    const colors = bundleOffer.appearance?.colors || {};
    const radius = bundleOffer.appearance?.borderRadiusPx ?? 12;
    const cardBg = colors.cardBg || "#ffffff";
    const cardBorder = colors.cardBorder || "#e2e8f0";
    const badgeBg = colors.badgeBg || "#004d5b";
    const badgeText = colors.badgeText || "#ffffff";
    const titleColor = colors.titleColor || "#0f172a";
    const bodyText = "#0f172a";
    const mutedText = "#64748b";

    const cardContainer = document.createElement("div");
    cardContainer.className = "custom-bundle-widget";
    cardContainer.dataset.offerId = bundleOffer.id ?? index;
    cardContainer.setAttribute("dir", isAr ? "rtl" : "ltr");
    cardContainer.style.cssText = `
      margin: 2rem 0;
      padding: 18px;
      border-radius: ${radius}px;
      background-color: ${cardBg};
      border: 1px solid ${cardBorder};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      font-family: inherit;
      text-align: start;
      color: ${bodyText};
    `;

    let html = `
      <div style="margin-bottom: 14px;">
        <h3 style="font-size: 1.15rem; font-weight: 700; color: ${titleColor}; margin: 0 0 4px 0;">
          ${escapeHTML(title || (isAr ? "اشتري المجموعة ووفر" : "Buy Bundle & Save"))}
        </h3>
        ${subtitle ? `<p style="font-size: 0.85rem; color: ${mutedText}; margin: 0;">${escapeHTML(subtitle)}</p>` : ""}
      </div>
      <div class="bundle-products-grid" style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px;">
        <div class="bundle-item-card" style="flex: 1; min-width: 130px; max-width: 160px; border: 1.5px solid ${badgeBg}; border-radius: 8px; padding: 10px; background: #f8fafc; text-align: center;">
          <div style="position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
            <span style="position: absolute; top: 4px; inset-inline-start: 4px; background: ${badgeBg}; color: ${badgeText}; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; z-index: 2;">${isAr ? "الأساسي" : "Main"}</span>
            ${mainProductData.image ? `<img src="${escapeHTML(mainProductData.image)}" alt="${escapeHTML(mainProductData.name)}" style="width: 100%; height: 100%; object-fit: cover;" />` : ""}
          </div>
          <div style="font-size: 0.8rem; font-weight: 600; color: ${bodyText}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em; line-height: 1.2; margin-bottom: 4px;">
            ${escapeHTML(mainProductData.name)}
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: ${bodyText};">${formatPrice(mainProductData.price)}</div>
        </div>
    `;

    bundleItemsData.forEach((item, idx) => {
      const discounted = applyRelatedDiscount(item.price, discountType, discountAmount);
      const showSale = discounted < item.price;
      html += `
        <div style="font-size: 1.2rem; font-weight: 700; color: #94a3b8; align-self: center;">+</div>
        <div class="bundle-item-card" data-idx="${idx}" style="flex: 1; min-width: 130px; max-width: 160px; border: 1px solid ${cardBorder}; border-radius: 8px; padding: 10px; background: #ffffff; text-align: center;">
          <div style="position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
            <input type="checkbox" class="bundle-item-cb" data-idx="${idx}" ${item.selected ? "checked" : ""} style="position: absolute; top: 6px; inset-inline-start: 6px; width: 18px; height: 18px; accent-color: ${badgeBg}; cursor: pointer; z-index: 3;" />
            ${item.image ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" style="width: 100%; height: 100%; object-fit: cover;" />` : ""}
          </div>
          <div style="font-size: 0.8rem; font-weight: 600; color: ${bodyText}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em; line-height: 1.2; margin-bottom: 4px;">
            ${escapeHTML(item.name)}
          </div>
          <div style="font-size: 0.85rem; font-weight: 700; color: ${bodyText};">${formatPrice(discounted)}</div>
          ${showSale ? `<div style="font-size: 0.7rem; text-decoration: line-through; color: #94a3b8;">${formatPrice(item.price)}</div>` : ""}
        </div>
      `;
    });

    html += `
      </div>
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border-radius: 8px; background: ${colors.selectedTier || "#f0fdf4"}; border: 1px dashed ${cardBorder};">
        <div>
          <div style="font-size: 0.75rem; color: ${mutedText}; margin-bottom: 2px;">${isAr ? "إجمالي الحزمة:" : "Bundle Total:"}</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span class="bundle-final-price" style="font-size: 1.25rem; font-weight: 800; color: ${bodyText};"></span>
            <span class="bundle-raw-price" style="font-size: 0.85rem; text-decoration: line-through; color: #94a3b8;"></span>
            <span class="bundle-savings-badge" style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: ${badgeBg}; color: ${badgeText}; display: none;"></span>
          </div>
        </div>
        <button type="button" class="bundle-add-all-btn" style="padding: 10px 20px; border: none; border-radius: 6px; background: ${badgeBg}; color: ${badgeText}; font-size: 0.9rem; font-weight: 700; cursor: pointer;">
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
      const pricing = calculateBundleTotals(
        mainProductData.price,
        bundleItemsData,
        discountType,
        discountAmount,
      );
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
        await addProductToCart({
          id: productId,
          quantity: 1,
          isCurrentProduct: true,
          needsOptions: mainProductData.needsOptions,
          url: mainProductData.url,
        });
        const selectedItems = bundleItemsData.filter((i) => i.selected);
        for (const item of selectedItems) {
          try {
            await addProductToCart({
              id: item.id,
              quantity: 1,
              isCurrentProduct: false,
              needsOptions: item.needsOptions,
              url: item.url,
            });
          } catch (err) {
            console.warn(`[BundleOffer] Failed to add item ${item.id}:`, err);
          }
        }
        if (salla.notify) {
          salla.notify.success(
            isAr ? "تمت إضافة المجموعة إلى السلة بنجاح!" : "Bundle added to cart successfully!",
          );
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
      let categoryIds = [];
      if (productId && salla?.product?.getDetails) {
        try {
          const response = await salla.product.getDetails(productId, ["category"]);
          const catData = response.data?.category || response.data?.categories;
          if (catData) {
            categoryIds = Array.isArray(catData)
              ? catData.map((c) => c.id).filter(Boolean)
              : catData.id
                ? [catData.id]
                : [];
          }
        } catch (err) {
          console.warn("[BundleOffer] Failed to fetch category details");
        }
      }

      const urlParams = new URLSearchParams();
      urlParams.append("productId", productId);
      if (categoryIds.length) urlParams.append("categoryIds", categoryIds.join(","));
      const res = await fetch(`${API_BASE}/offers/storefront/${merchantId}?${urlParams}`);
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
        try {
          const widget = await buildBundleWidget(bundleOffers[i], i);
          if (widget) rootContainer.appendChild(widget);
        } catch (err) {
          console.warn("[BundleOffer] Failed to build widget:", bundleOffers[i]?.id, err);
        }
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
