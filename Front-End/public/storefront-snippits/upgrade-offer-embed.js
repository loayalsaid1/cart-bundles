/**
 * Storefront Upgrade Offer Embed Script for Salla Product Pages
 * Local-only offer: swap current product for upgrade product (optional coupon).
 */
salla.onReady(async () => {
  if (window.__UPGRADE_OFFER_EMBED_LOADED__) return;
  window.__UPGRADE_OFFER_EMBED_LOADED__ = true;
  if (document.getElementById("custom-upgrade-widgets-root")) return;

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

  function mapProduct(d, fallbackId) {
    if (!d) {
      return {
        id: fallbackId,
        name: "",
        price: 0,
        image: "",
        url: "",
        needsOptions: false,
      };
    }
    let img = d.main_image || d.image || d.thumbnail || (d.images && d.images[0]?.url);
    if (typeof img === "object" && img !== null) img = img.url;
    const options = Array.isArray(d.options) ? d.options : [];
    return {
      id: d.id,
      name: d.name || "",
      price: parseFloat(d.price?.amount ?? d.price ?? 0),
      image: img || "",
      url: d.url || d.urls?.customer || "",
      needsOptions: options.length > 0,
    };
  }

  async function buildUpgradeWidget(offer, index) {
    const settings = offer.upgradeSettings || {};
    const upgradeId = settings.upgradeSallaProductId;
    if (!upgradeId) return null;

    const title = offer.title?.[isAr ? "ar" : "en"] || offer.title?.ar || "";
    const subtitle = offer.subtitle?.[isAr ? "ar" : "en"] || offer.subtitle?.ar || "";
    const couponCode = (settings.couponCode || "").trim();
    const redirectToCart = Boolean(offer.redirectToCartAfterAdd);

    const results = await Promise.allSettled([
      salla.product.getDetails(productId, ["options"]),
      salla.product.getDetails(upgradeId, ["options"]),
    ]);

    const baseData = mapProduct(
      results[0].status === "fulfilled" ? results[0].value?.data : null,
      productId,
    );
    const upgradeData = mapProduct(
      results[1].status === "fulfilled" ? results[1].value?.data : null,
      upgradeId,
    );
    if (!upgradeData.name && !upgradeData.price) return null;

    const colors = offer.appearance?.colors || {};
    const radius = offer.appearance?.borderRadiusPx ?? 12;
    const cardBg = colors.cardBg || "#ffffff";
    const cardBorder = colors.cardBorder || "#e2e8f0";
    const badgeBg = colors.badgeBg || "#004d5b";
    const badgeText = colors.badgeText || "#ffffff";
    const titleColor = colors.titleColor || "#0f172a";
    const bodyText = "#0f172a";
    const mutedText = "#64748b";

    const card = document.createElement("div");
    card.className = "custom-upgrade-widget";
    card.dataset.offerId = offer.id ?? index;
    card.setAttribute("dir", isAr ? "rtl" : "ltr");
    card.style.cssText = `
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

    card.innerHTML = `
      <div style="margin-bottom: 14px;">
        <h3 style="font-size: 1.15rem; font-weight: 700; color: ${titleColor}; margin: 0 0 4px 0;">
          ${escapeHTML(title || (isAr ? "رقِّ منتجك" : "Upgrade your product"))}
        </h3>
        ${subtitle ? `<p style="font-size: 0.85rem; color: ${mutedText}; margin: 0;">${escapeHTML(subtitle)}</p>` : ""}
      </div>
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
        <div style="flex: 1; min-width: 0; border: 1px solid ${cardBorder}; border-radius: 8px; padding: 10px; text-align: center;">
          <div style="aspect-ratio: 1; border-radius: 6px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
            ${baseData.image ? `<img src="${escapeHTML(baseData.image)}" alt="${escapeHTML(baseData.name)}" style="width: 100%; height: 100%; object-fit: cover;" />` : ""}
          </div>
          <div style="font-size: 0.8rem; font-weight: 600; color: ${bodyText}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(baseData.name)}</div>
          <div style="font-size: 0.85rem; color: ${mutedText};">${formatPrice(baseData.price)}</div>
        </div>
        <div style="font-size: 1.25rem; font-weight: 700; color: ${mutedText};">${isAr ? "←" : "→"}</div>
        <div style="flex: 1; min-width: 0; border: 1.5px solid ${badgeBg}; border-radius: 8px; padding: 10px; text-align: center; background: ${colors.selectedTier || "#f0fdf4"};">
          <div style="aspect-ratio: 1; border-radius: 6px; overflow: hidden; margin-bottom: 8px; background: #f1f5f9;">
            ${upgradeData.image ? `<img src="${escapeHTML(upgradeData.image)}" alt="${escapeHTML(upgradeData.name)}" style="width: 100%; height: 100%; object-fit: cover;" />` : ""}
          </div>
          <div style="font-size: 0.8rem; font-weight: 600; color: ${bodyText}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(upgradeData.name)}</div>
          <div style="font-size: 0.85rem; font-weight: 700; color: ${bodyText};">${formatPrice(upgradeData.price)}</div>
        </div>
      </div>
      ${couponCode ? `<p style="margin: 0 0 12px 0; padding: 8px 12px; border-radius: 6px; background: ${colors.selectedTier || "#f0fdf4"}; font-size: 0.8rem; text-align: center;">${isAr ? "استخدم الكود" : "Use code"} <strong>${escapeHTML(couponCode)}</strong></p>` : ""}
      <button type="button" class="upgrade-add-btn" style="width: 100%; padding: 10px 20px; border: none; border-radius: 6px; background: ${badgeBg}; color: ${badgeText}; font-size: 0.9rem; font-weight: 700; cursor: pointer;">
        ${isAr ? "الترقية الآن" : "Upgrade now"}
      </button>
    `;

    const btn = card.querySelector(".upgrade-add-btn");
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.style.opacity = "0.7";
      try {
        await addProductToCart({
          id: upgradeData.id,
          quantity: 1,
          isCurrentProduct: String(upgradeData.id) === String(productId),
          needsOptions: upgradeData.needsOptions,
          url: upgradeData.url,
        });
        if (salla.notify) {
          salla.notify.success(isAr ? "تمت إضافة منتج الترقية للسلة" : "Upgrade product added to cart");
        }
        if (redirectToCart) {
          window.location.href = (salla.url && salla.url.get("cart")) || "/cart";
        }
      } catch (err) {
        console.error("[UpgradeOffer] Error adding upgrade:", err);
        if (salla.notify) {
          salla.notify.error(isAr ? "فشل إضافة منتج الترقية" : "Failed to add upgrade product");
        }
      } finally {
        btn.disabled = false;
        btn.style.opacity = "1";
      }
    });

    return card;
  }

  async function initUpgradeOffers() {
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
          console.warn("[UpgradeOffer] Failed to fetch category details");
        }
      }

      const urlParams = new URLSearchParams();
      urlParams.append("productId", productId);
      if (categoryIds.length) urlParams.append("categoryIds", categoryIds.join(","));
      const res = await fetch(`${API_BASE}/offers/storefront/${merchantId}?${urlParams}`);
      if (!res.ok) return;

      const offers = await res.json();
      if (!Array.isArray(offers) || !offers.length) return;

      const upgradeOffers = offers.filter((o) => o.kind === "upgrade_offer");
      if (!upgradeOffers.length) return;

      const anchor = getTargetAnchor();
      if (!anchor) return;

      const root = document.createElement("div");
      root.id = "custom-upgrade-widgets-root";

      for (let i = 0; i < upgradeOffers.length; i++) {
        try {
          const widget = await buildUpgradeWidget(upgradeOffers[i], i);
          if (widget) root.appendChild(widget);
        } catch (err) {
          console.warn("[UpgradeOffer] Failed to build widget:", upgradeOffers[i]?.id, err);
        }
      }

      if (root.hasChildNodes()) {
        anchor.insertAdjacentElement("beforebegin", root);
      }
    } catch (err) {
      console.error("[UpgradeOffer] Error initializing:", err);
    }
  }

  initUpgradeOffers();
});
