// ==UserScript==
// @name        AliExpress Bundle Deals Redirector
// @namespace   Violentmonkey Scripts
// @match       *://*.aliexpress.com/ssr/*/BundleDeals*
// @grant       none
// @version     1.0
// @author      Marcelo Frau
// @run-at      document-start
// @description Redireciona links de Bundle Deals para a página padrão do produto.
// ==/UserScript==

(function () {
    'use strict';

    const urlParams = new URLSearchParams(window.location.search);
    const productIdsRaw = urlParams.get('productIds');

    if (productIdsRaw) {
        // Pega o primeiro ID antes do caractere ":" ou ","
        const productId = productIdsRaw.split(/[:|,]/)[0];

        if (productId) {
            const newUrl = `https://www.aliexpress.com/item/${productId}.html`;
            window.location.replace(newUrl);
        }
    }
})();