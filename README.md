# Violentmonkey Userscripts

Useful browser userscripts for Violentmonkey, Tampermonkey, or compatible managers.

These scripts are small personal utilities that solve specific web annoyances: exporting Gemini chats, decoding obfuscated magnet links, and bypassing AliExpress Bundle Deals redirects.

## Scripts

| Script | Site | What it does |
|--------|------|--------------|
| `gemini-copy-button.js` | `gemini.google.com` | Adds a floating button to export the current Gemini conversation as Markdown. Copies to clipboard and downloads a `.md` file. |
| `magnet-decoder.js` | Any website | Detects Base64-encoded magnet links in URL parameters, including reversed Base64 strings, and adds a direct magnet link next to the original link. |
| `aliexpress-bundle-bypass.js` | `aliexpress.com` | Redirects AliExpress Bundle Deals product URLs to the regular product page. |

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or another userscript manager.
2. Open a script file from this repository on GitHub.
3. Click `Raw`.
4. Confirm install in your userscript manager.

## Permissions

| Script | Match scope | Grants |
|--------|-------------|--------|
| `gemini-copy-button.js` | `https://gemini.google.com/*` | `GM_setClipboard`, `GM_addStyle` |
| `magnet-decoder.js` | `*://*/*` | none |
| `aliexpress-bundle-bypass.js` | `*://*.aliexpress.com/ssr/*/BundleDeals*` | none |

`magnet-decoder.js` uses a broad match scope because obfuscated magnet links can appear on many sites. It does not send data anywhere.

## Privacy

- No telemetry.
- No analytics.
- No external API calls added by these scripts.
- No data is sent to a server by these scripts.
- All processing runs locally in the browser page context.

## Repository Layout

```text
.
├── aliexpress-bundle-bypass.js
├── gemini-copy-button.js
├── magnet-decoder.js
└── README.md
```

## License

MIT
