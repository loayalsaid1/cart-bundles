(function () {
  if (window.__CART_BUNDLES_TRACK__) return;

  const API_BASE = "https://backend-dev.cartbundles.com/api/v1";

  window.__CART_BUNDLES_TRACK__ = function trackOfferEvent(payload) {
    if (!payload || !payload.event) return;
    const merchantId = Number(payload.merchantId);
    const offerId = Number(payload.offerId);
    if (!merchantId || !offerId) return;
    const body = {
      merchantId: merchantId,
      offerId: offerId,
      event: payload.event,
      source: payload.source,
    };
    if (payload.productId != null && payload.productId !== "") {
      body.productId = Number(payload.productId);
    }
    fetch(API_BASE + "/storefront/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).then(function (res) {
      if (!res.ok && res.status !== 429) {
        console.warn("[CartBundles] Failed to record " + body.event + ":", res.status);
      }
    }).catch(function (err) {
      console.warn("[CartBundles] Failed to record " + body.event + ":", err);
    });
  };
})();
