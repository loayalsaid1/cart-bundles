// 1. Massive console log to prove the file is being requested and executed
console.log("%c🚀 SALLA APP SNIPPET IS LOADED!", "background: green; color: white; display: block; padding: 10px; font-size: 16px; font-weight: bold;");

// 2. Function to inject a visible red box
function injectSallaDebugBox() {
    // Prevent duplicates
    if (document.getElementById('salla-debug-box')) return;

    // Safely check if 'salla' exists and get the customer name (fallback to 'Guest' or 'Unknown')
    var customerName = (typeof salla !== 'undefined' && salla.config && salla.config.get)
        ? (salla.config.get('customer.name') || 'Guest')
        : 'Unknown (salla object not ready)';

    var testDiv = document.createElement('div');
    testDiv.id = 'salla-debug-box';
    testDiv.innerHTML = '✅ APP SNIPPET WORKING! User: ' + customerName;

    // Styling
    testDiv.style.backgroundColor = 'red';
    testDiv.style.color = 'white';
    testDiv.style.padding = '15px';
    testDiv.style.fontWeight = 'bold';
    testDiv.style.borderRadius = '5px';
    testDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';

    // NOTE: If you want it floating, uncomment these:
    // testDiv.style.position = 'fixed';
    // testDiv.style.bottom = '20px';
    // testDiv.style.left = '20px';
    // testDiv.style.zIndex = '999999999'; 

    // Safely find targets
    var target1 = document.querySelector(".form.product-form");
    var target2 = document.querySelector("#main-content > section > div");

    // Safely append to the first available target on the page
    if (target1) {
        var productId = salla.config.get('page.id');
        console.log(salla.config.get('page.id'));
        var productsSlider = document.createElement('salla-products-slider');

        // Set the attribute
        // productsSlider.setAttribute('product-id', productId);

        // Fetch full product details from Salla's frontend API
        salla.product.fetch({ source: "search", source_value: "فستان" }).then(res => {
            console.log("search result:", res)
            console.log(productId + "-> -> ")

            console.log("📦 Full Product Data:", res.data);
            console.log("Product Name:", res.data);
            console.log("Product Price:", res.data);
            productsSlider.sourceValue = res.data;
            productsSlider.source="json"
            target1.appendChild(productsSlider);
            const qtyInput = document.querySelector('input[name="quantity"]');

            qtyInput.value = 33;

            // 2. THIS IS CRITICAL: Dispatch an event so Salla's internal code knows it changed
            const event = new Event('change', { bubbles: true });
            qtyInput.dispatchEvent(event);
            console.log("event loaded")

        }).catch((err) => console.log("crap" + err));
        target1.appendChild(testDiv);
        console.log("✅ Attached to .product-form");
        const installment = document.querySelector('salla-installment');
        const price = installment?.getAttribute('price');
        console.log(price + "asdf")
    } else if (target2) {
        target2.appendChild(testDiv);
        console.log("✅ Attached to #main-content section");
    } else {
        // Fallback: Just attach it to the body so you at least see it
        document.body.appendChild(testDiv);
        console.log("✅ Attached to body (fallback)");
    }
}

// 3. Safe Execution: ALWAYS wait for DOMContentLoaded when appending to the DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSallaDebugBox);
} else {
    injectSallaDebugBox();
}
Salla.hooks.registerHook('salla-add-product-button', 'componentDidLoad', (component) => {
    component.btn.setText('Subscribe Now');
});

Salla.onReady(() => {
    Salla.hooks.registerHook('salla-add-product-button', 'componentDidLoad', (element) => {
        console.log("Add product button ready:", element);

        // Inject BEFORE the button
        const beforeDiv = document.createElement('div');
        beforeDiv.innerHTML = '<p>🔥 Special offer before you add!</p>';
        element.parentNode.insertBefore(beforeDiv, element);

        // Inject AFTER the button
        const afterDiv = document.createElement('div');
        afterDiv.innerHTML = '<p>Need help? Chat with us!</p>';
        element.parentNode.insertBefore(afterDiv, element.nextSibling);
    });
});