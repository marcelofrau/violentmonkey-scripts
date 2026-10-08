// ==UserScript==
// @name         Google Maps - Force WebGL
// @namespace    https://marcelofrau.com/
// @version      1.0
// @description  Always force Google Maps to use WebGL rendering
// @match        https://www.google.com/maps*
// @match        https://maps.google.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const url = new URL(window.location.href);

    if (url.searchParams.get('force') !== 'webgl') {
        url.searchParams.set('force', 'webgl');
        window.location.replace(url.toString());
    }
})();
