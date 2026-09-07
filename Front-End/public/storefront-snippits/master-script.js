async function fetchSnippit(scriptUrl) {
  // 1. Point this to your local tunnel or backend domain where the JS file lives
  if (!scriptUrl) {
    console.warn("Fetch script called without a scriptURL");
    return
  }
  const SCRIPT_URL = scriptUrl

  const SCRIPT_ID = "my-local-dev-script";

  // 2. Remove the old script if it exists (useful for SPA navigation or console running)
  const existingScript = document.getElementById(SCRIPT_ID);
  if (existingScript) {
    existingScript.remove();
  }

  // 3. Create the new script tag
  const script = document.createElement("script");
  script.id = SCRIPT_ID;

  // 4. THE MAGIC TRICK: Append a timestamp. 
  // This forces the browser to ignore the cache and download your freshly saved code!
  script.src = `${SCRIPT_URL}?t=${new Date().getTime()}`;
  script.defer = true;

  // 5. Success/Error logging
  script.onload = () => console.log(`[Dev Loader] 🚀 Successfully loaded local script: ${SCRIPT_URL}`);
  script.onerror = () => console.error(`[Dev Loader] ❌ Failed to load script. Is your local server running and CORS enabled?`);

  // 6. Inject it into the page
  document.body.appendChild(script);
};
const BASE_URL = "https://frontend-dev.cartbundles.com/storefront-snippits/";
const SCRIPTS_NAMES = [
  "addon-offer-embed.js",
  "quantity-offer-embed.js",
  "bundle-offer-embed.js",
  "upgrade-offer-embed.js",
  "recommendation-offer-embed.js",
]

SCRIPTS_NAMES.forEach((script) => {
  fetchSnippit(
    BASE_URL + script
  )
})