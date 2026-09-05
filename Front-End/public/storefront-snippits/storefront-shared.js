/**
 * Shared storefront helpers for CartBundles embed scripts.
 * Attaches to window.__CARTBUNDLES_SF__ (idempotent).
 */
(function (global) {
  "use strict";

  if (global.__CARTBUNDLES_SF__) return;

  var API_BASE = "https://backend-dev.cartbundles.com/api/v1";

  var OPTION_NAME_RE = /(?:product_)?options\[(\d+)\]/;

  function getLanguage() {
    if (typeof salla !== "undefined" && salla.config && salla.config.get) {
      var sallaLang = salla.config.get("user.language");
      if (sallaLang) return sallaLang.startsWith("ar") ? "ar" : "en";
    }
    return document.documentElement.lang && document.documentElement.lang.startsWith("ar")
      ? "ar"
      : "en";
  }

  function isRtl() {
    return getLanguage() === "ar";
  }

  function getCurrency() {
    if (typeof salla !== "undefined" && salla.config && salla.config.get) {
      return salla.config.get("store.currency") || (isRtl() ? "ر.س" : "SAR");
    }
    return isRtl() ? "ر.س" : "SAR";
  }

  function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, function (t) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[t];
    });
  }

  function formatPrice(price) {
    var n = parseFloat(price);
    if (isNaN(n)) n = 0;
    return "<bdi>" + n.toFixed(2) + " " + getCurrency() + "</bdi>";
  }

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

  function getStoreAndProductInfo(currentScript) {
    var merchantId = null;
    var productId = null;

    if (typeof salla !== "undefined" && salla.config && salla.config.get) {
      merchantId = salla.config.get("store.id") || salla.config.get("user.id");
      productId = salla.config.get("page.id") || salla.config.get("product.id");
    }

    if (!merchantId && currentScript) {
      merchantId = currentScript.getAttribute("data-merchant-id");
    }
    if (!productId && currentScript) {
      productId = currentScript.getAttribute("data-product-id");
    }

    return { merchantId: merchantId, productId: productId };
  }

  function productNeedsOptions(details) {
    var opts = details && details.options;
    return Array.isArray(opts) && opts.length > 0;
  }

  function collectFormOptions(form) {
    var options = {};
    if (!form) return options;

    function assign(optionId, value) {
      if (value === undefined || value === null || value === "") return;
      if (Object.prototype.hasOwnProperty.call(options, optionId)) {
        var prev = options[optionId];
        options[optionId] = Array.isArray(prev) ? prev.concat(value) : [prev, value];
      } else {
        options[optionId] = value;
      }
    }

    if (typeof FormData === "function") {
      var formData = new FormData(form);
      formData.forEach(function (value, key) {
        var match = key.match(OPTION_NAME_RE);
        if (match) assign(match[1], value);
      });
    }

    var fields = form.querySelectorAll(
      "[name^='options['], [name^='product_options['], salla-product-options input, salla-product-options select"
    );
    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      var name = el.getAttribute("name") || "";
      var match = name.match(OPTION_NAME_RE);
      if (!match) continue;
      if (el.type === "radio" || el.type === "checkbox") {
        if (el.checked) assign(match[1], el.value);
      } else if (!el.disabled) {
        assign(match[1], el.value);
      }
    }

    return options;
  }

  function collectCurrentProductPayload(quantity) {
    var form = getProductForm();
    var options = collectFormOptions(form);
    var qty = quantity;
    if (qty == null) {
      var qtyInput =
        (form && form.querySelector('input[name="quantity"]')) ||
        document.querySelector('input[name="quantity"]');
      var sallaQty = document.querySelector("salla-quantity-input");
      qty = Number(
        (qtyInput && qtyInput.value) ||
          (sallaQty && (sallaQty.value || sallaQty.getAttribute("value"))) ||
          1
      );
    }
    var payload = { quantity: qty > 0 ? qty : 1 };
    if (Object.keys(options).length) payload.options = options;
    return payload;
  }

  function getCartAdder() {
    if (typeof salla === "undefined" || !salla.cart) return null;
    if (typeof salla.cart.addItem === "function") {
      return function (payload) {
        return salla.cart.addItem(payload);
      };
    }
    if (salla.cart.api && typeof salla.cart.api.addItem === "function") {
      return function (payload) {
        return salla.cart.api.addItem(payload);
      };
    }
    return null;
  }

  function notify(type, arMsg, enMsg) {
    var msg = isRtl() ? arMsg : enMsg;
    if (typeof salla !== "undefined" && salla.notify && typeof salla.notify[type] === "function") {
      salla.notify[type](msg);
      return;
    }
    if (type === "error") console.error("[CartBundles]", msg);
  }

  function openProductPage(url, productId) {
    var href = url || "/p/" + productId;
    window.open(href, "_blank");
  }

  /**
   * Add a product using the same option source as the theme ATC when possible.
   * Current-page product: reuse the product form's selected options.
   * Other products with options: cannot invent values — open the product page.
   */
  function addProductToCart(spec) {
    var id = spec && spec.id;
    var quantity = (spec && spec.quantity) || 1;
    var needsOptions = Boolean(spec && spec.needsOptions);
    var isCurrentProduct = Boolean(spec && spec.isCurrentProduct);
    var url = spec && spec.url;
    var add = getCartAdder();

    if (!id) return Promise.reject(new Error("Missing product id"));

    if (!isCurrentProduct && needsOptions) {
      notify(
        "error",
        "هذا المنتج يتطلب اختيار خيارات أولاً",
        "This product requires options — open it to choose them"
      );
      openProductPage(url, id);
      return Promise.resolve({ skipped: true, reason: "options_required" });
    }

    if (!add) return Promise.reject(new Error("salla.cart.addItem unavailable"));

    var payload = { id: id, quantity: quantity };
    if (isCurrentProduct) {
      var fromForm = collectCurrentProductPayload(quantity);
      payload.quantity = fromForm.quantity;
      if (fromForm.options) payload.options = fromForm.options;
    }

    return Promise.resolve(add(payload)).catch(function (err) {
      var text = err && (err.message || err.msg || String(err));
      var missingOptions =
        /option/i.test(text || "") && /required|يجب|خيار/i.test(text || "");
      if (isCurrentProduct && missingOptions) {
        notify(
          "error",
          "يرجى اختيار خيارات المنتج أولاً",
          "Please select product options first"
        );
      } else if (!isCurrentProduct && missingOptions) {
        openProductPage(url, id);
      }
      throw err;
    });
  }

  function applyRelatedDiscount(price, discountType, discountAmount) {
    var p = parseFloat(price) || 0;
    if (!discountType) return p;
    if (discountType === "free-product" || discountType === "free_product") return 0;
    if (discountType === "percentage") {
      var amt = parseFloat(discountAmount) || 0;
      return Math.max(0, p * (1 - amt / 100));
    }
    return p;
  }

  function calculateBundleTotals(mainPrice, relatedItems, discountType, discountAmount) {
    var active = (relatedItems || []).filter(function (item) {
      return item.selected;
    });
    var relatedRaw = active.reduce(function (acc, item) {
      return acc + (parseFloat(item.price) || 0);
    }, 0);
    var relatedFinal = active.reduce(function (acc, item) {
      return acc + applyRelatedDiscount(item.price, discountType, discountAmount);
    }, 0);
    var main = parseFloat(mainPrice) || 0;
    var rawTotal = main + relatedRaw;
    var finalTotal = main + relatedFinal;
    return {
      rawTotal: rawTotal,
      finalTotal: finalTotal,
      savings: Math.max(0, rawTotal - finalTotal),
    };
  }

  function normalizeProductImage(data) {
    if (!data) return "";
    var img =
      data.main_image ||
      data.image ||
      data.thumbnail ||
      (data.images && data.images[0] && data.images[0].url);
    if (img && typeof img === "object") img = img.url;
    return img || "";
  }

  function fetchProductDetails(sallaProductId) {
    if (typeof salla === "undefined" || !salla.product || !salla.product.getDetails) {
      return Promise.resolve({
        id: sallaProductId,
        name: "",
        price: 0,
        image: "",
        url: "",
        options: [],
        needsOptions: false,
      });
    }

    return salla.product
      .getDetails(sallaProductId, ["options"])
      .then(function (res) {
        var d = res && res.data;
        if (!d) {
          return {
            id: sallaProductId,
            name: "",
            price: 0,
            image: "",
            url: "",
            options: [],
            needsOptions: false,
          };
        }
        var options = Array.isArray(d.options) ? d.options : [];
        return {
          id: d.id,
          name: d.name || "",
          price: parseFloat(d.price && d.price.amount != null ? d.price.amount : d.price) || 0,
          image: normalizeProductImage(d),
          url: d.url || (d.urls && d.urls.customer) || "",
          options: options,
          needsOptions: options.length > 0,
        };
      })
      .catch(function (err) {
        console.warn("[CartBundles] Failed to fetch product details:", err);
        return {
          id: sallaProductId,
          name: "",
          price: 0,
          image: "",
          url: "",
          options: [],
          needsOptions: false,
        };
      });
  }

  function fetchStorefrontOffers(merchantId, productId, categoryIds) {
    var urlParams = new URLSearchParams();
    if (productId) urlParams.append("productId", String(productId));
    if (categoryIds && categoryIds.length) {
      urlParams.append("categoryIds", categoryIds.join(","));
    }
    var qs = urlParams.toString();
    return fetch(API_BASE + "/offers/storefront/" + merchantId + (qs ? "?" + qs : "")).then(
      function (res) {
        if (!res.ok) return [];
        return res.json();
      }
    );
  }

  function fetchCategoryIds(productId) {
    if (!productId || typeof salla === "undefined" || !salla.product || !salla.product.getDetails) {
      return Promise.resolve([]);
    }
    return salla.product
      .getDetails(productId, ["category"])
      .then(function (response) {
        var catData =
          response &&
          response.data &&
          (response.data.category || response.data.categories);
        if (!catData) return [];
        if (Array.isArray(catData)) return catData.map(function (c) { return c.id; }).filter(Boolean);
        if (catData.id) return [catData.id];
        return [];
      })
      .catch(function () {
        return [];
      });
  }

  function localizedText(record, lang) {
    if (!record) return "";
    return record[lang] || record.ar || record.en || "";
  }

  function cartUrl() {
    if (typeof salla !== "undefined" && salla.url && typeof salla.url.get === "function") {
      return salla.url.get("cart") || "/cart";
    }
    return "/cart";
  }

  global.__CARTBUNDLES_SF__ = {
    API_BASE: API_BASE,
    getLanguage: getLanguage,
    isRtl: isRtl,
    getCurrency: getCurrency,
    escapeHTML: escapeHTML,
    formatPrice: formatPrice,
    getTargetAnchor: getTargetAnchor,
    getProductForm: getProductForm,
    getStoreAndProductInfo: getStoreAndProductInfo,
    productNeedsOptions: productNeedsOptions,
    collectCurrentProductPayload: collectCurrentProductPayload,
    addProductToCart: addProductToCart,
    applyRelatedDiscount: applyRelatedDiscount,
    calculateBundleTotals: calculateBundleTotals,
    fetchProductDetails: fetchProductDetails,
    fetchStorefrontOffers: fetchStorefrontOffers,
    fetchCategoryIds: fetchCategoryIds,
    localizedText: localizedText,
    notify: notify,
    cartUrl: cartUrl,
  };
})(window);
