// src/browser-assets.ts
var browserWorkerJs = Object.freeze({
  key: "browserWorkerJs",
  packagePath: "dist/browser.worker.global.js",
  outputName: "browser.worker.global.js",
  mimeType: "text/javascript"
});
var sofficeJs = Object.freeze({
  key: "sofficeJs",
  packagePath: "wasm/soffice.js",
  outputName: "soffice.js",
  mimeType: "text/javascript"
});
var sofficeWasm = Object.freeze({
  key: "sofficeWasm",
  packagePath: "wasm/soffice.wasm",
  outputName: "soffice.wasm",
  mimeType: "application/wasm"
});
var sofficeData = Object.freeze({
  key: "sofficeData",
  packagePath: "wasm/soffice.data",
  outputName: "soffice.data",
  mimeType: "application/octet-stream"
});
var LIBREOFFICE_BROWSER_ASSET_CONTRACT = Object.freeze({
  schemaVersion: 1,
  packageName: "@killbus/libreoffice-converter",
  threading: "none",
  assets: Object.freeze({
    browserWorkerJs,
    sofficeJs,
    sofficeWasm,
    sofficeData
  })
});

export { LIBREOFFICE_BROWSER_ASSET_CONTRACT };
//# sourceMappingURL=browser-assets.js.map
//# sourceMappingURL=browser-assets.js.map