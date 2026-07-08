// ==UserScript==
// @name         Magnet Decoder (Base64 param / reverse aware)
// @namespace    magnet-decoder
// @version      1.2
// @description  Detecta magnet ofuscado em Base64 (normal ou invertido) dentro de parâmetros de links
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function isProbablyBase64(str) {
        return /^[A-Za-z0-9+/=]+$/.test(str) && str.length > 20;
    }

    function tryDecodeBase64(str) {
        try {
            return atob(str);
        } catch {
            return null;
        }
    }

    function decodeCandidate(str) {
        if (!isProbablyBase64(str)) return null;

        // tentativa direta
        let decoded = tryDecodeBase64(str);
        if (decoded && decoded.startsWith("magnet:?")) return decoded;

        // tentativa invertida
        let reversed = str.split('').reverse().join('');
        decoded = tryDecodeBase64(reversed);
        if (decoded && decoded.startsWith("magnet:?")) return decoded;

        return null;
    }

    function processLink(a) {
        if (!a.href) return;

        let url;
        try {
            url = new URL(a.href);
        } catch {
            return;
        }

        for (let [key, value] of url.searchParams.entries()) {
            let decodedMagnet = decodeCandidate(value);
            if (decodedMagnet) {
                insertMagnetLink(a, decodedMagnet, key);
                break;
            }
        }
    }

    function insertMagnetLink(originalLink, magnet, paramName) {
        if (originalLink.dataset.magnetDecoded) return;
        originalLink.dataset.magnetDecoded = "true";

        let magnetLink = document.createElement("a");
        magnetLink.href = magnet;
        magnetLink.textContent = "🧲 magnet";
        magnetLink.style.marginLeft = "6px";
        magnetLink.style.color = "#0a7";
        magnetLink.style.fontWeight = "bold";
        magnetLink.title = `Magnet decodificado do parâmetro "${paramName}"`;

        originalLink.after(magnetLink);
    }

    function scan() {
        document.querySelectorAll("a").forEach(processLink);
    }

    scan();

    // Para sites que carregam links dinamicamente
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
})();
