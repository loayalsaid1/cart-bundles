/**
 * app snippit for salla store front, unitlizing the Salla JS sdk.
 * This is to get storeId/merchantID and the page id (productID)
 * 
 * 
 * call my backend for a bunch of products as a recommendation and redner them in a salla-products-slider 
 * giving it the property source = "json" and source value, the list of products from the API.
 */
const BACKEND_URL = 'https://n2r4sc-ip-197-53-102-100.tunnelmole.net/api/v1';
Salla.onReady(() => {


    const storeId = salla.config.get('store.id');
    const productId = salla.config.get('page.id');

    // Fetch products from your backend
    fetch(`${BACKEND_URL}/salla/products/recommendations?store_id=${storeId}&product_id=${productId}`)
        .then(response => response.json())
        .then(data => {
            // Create the slider component
            const slider = document.createElement('salla-products-slider');

            // Set the source attribute to 'json'
            // slider.setAttribute('source', 'json');

            // // Set the source-value attribute to your product data
            // // Salla will serialize this JSON and pass it to the component
            // slider.setAttribute('source-value', JSON.stringify(data));

            slider.source = "json";
            slider.sourceValue = data;
            // Append the slider to a container on the page
            // For example, append it after the main product form
            const productForm = document.querySelector('.form.product-form');
            if (productForm) {
                productForm.parentNode.appendChild(slider);
            } else {
                // Fallback: append to body if product form not found
                document.body.appendChild(slider);
            }
        })
})