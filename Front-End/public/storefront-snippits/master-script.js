function fetchSnippit(scriptUrl) {
  if (!scriptUrl) {
    console.warn("Fetch script called without a scriptURL");
    return Promise.resolve();
  }
  const SCRIPT_URL = scriptUrl;
  const SCRIPT_ID = "cart-bundles-" + SCRIPT_URL.split("/").pop().split("?")[0];

  const existingScript = document.getElementById(SCRIPT_ID);
  if (existingScript) {
    existingScript.remove();
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `${SCRIPT_URL}?t=${new Date().getTime()}`;
    script.onload = () => resolve();
    script.onerror = () => {
      console.error("[Dev Loader] Failed to load script: " + SCRIPT_URL);
      resolve();
    };
    document.body.appendChild(script);
  });
}

const BASE_URL = "https://frontend-dev.cartbundles.com/storefront-snippits/";
const SCRIPTS_NAMES = [
  "addon-offer-embed.js",
  "quantity-offer-embed.js",
  "bundle-offer-embed.js",
  "upgrade-offer-embed.js",
  "recommendation-offer-embed.js",
];

fetchSnippit(BASE_URL + "event-tracker.js").then(() => {
  SCRIPTS_NAMES.forEach((script) => {
    fetchSnippit(BASE_URL + script);
  });
});