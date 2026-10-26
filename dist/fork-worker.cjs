'use strict';

var path = require('path');
var fs = require('fs');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespace(path);
var fs__namespace = /*#__PURE__*/_interopNamespace(fs);

var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var require_fork_worker = __commonJS({
  "src/fork-worker.cts"() {
    var wasmPath = process.env.WASM_PATH || "./wasm";
    var verbose = process.env.VERBOSE === "true";
    var wasmDir = path__namespace.isAbsolute(wasmPath) ? wasmPath : path__namespace.resolve(wasmPath);
    if (!fs__namespace.existsSync(wasmDir)) {
      const error = new Error(
        `WASM directory not found: ${wasmDir}
  WASM_PATH env: ${process.env.WASM_PATH || "(not set)"}
  CWD: ${process.cwd()}
  Resolved to: ${wasmDir}`
      );
      console.error("[ForkWorker]", error.message);
      process.send?.({ type: "error", error: error.message });
      process.exit(1);
    }
    process.chdir(wasmDir);
    function log(...args) {
      if (verbose) console.error("[ForkWorker]", ...args);
    }
    var NodeXHR = class {
      readyState = 0;
      status = 0;
      responseType = "";
      response = null;
      responseText = "";
      onload = null;
      onerror = null;
      onreadystatechange = null;
      _url = "";
      open(_m, url) {
        this._url = url;
        this.readyState = 1;
      }
      overrideMimeType() {
      }
      setRequestHeader() {
      }
      send() {
        try {
          const data = fs__namespace.readFileSync(this._url);
          this.status = 200;
          this.readyState = 4;
          if (this.responseType === "arraybuffer") {
            this.response = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
          } else {
            this.responseText = data.toString("utf8");
            this.response = this.responseText;
          }
          if (this.onload) this.onload();
          if (this.onreadystatechange) this.onreadystatechange();
        } catch (err) {
          this.status = 404;
          this.readyState = 4;
          if (this.onerror) this.onerror(err);
        }
      }
    };
    global.XMLHttpRequest = NodeXHR;
    var Module = null;
    var lokPtr = 0;
    var initialized = false;
    function allocString(str) {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(str + "\0");
      const ptr = Module._malloc(bytes.length);
      Module.HEAPU8.set(bytes, ptr);
      return ptr;
    }
    function readPtr(addr) {
      return Module.HEAP32[addr >> 2];
    }
    function initLOK() {
      log("Initializing LOK...");
      const pathPtr = allocString("/instdir/program");
      if (Module._lok_preinit) {
        Module._lok_preinit(pathPtr, 0);
      }
      lokPtr = Module._libreofficekit_hook(pathPtr);
      Module._free(pathPtr);
      if (lokPtr === 0) throw new Error("LOK init failed");
      log("LOK ready, ptr:", lokPtr);
      initialized = true;
    }
    function convert(inputData, inputExt, outputFormat, filterOptions) {
      if (!initialized) throw new Error("Not initialized");
      const inputPath = `/tmp/input/doc.${inputExt}`;
      const outputPath = `/tmp/output/doc.${outputFormat}`;
      try {
        Module.FS.mkdir("/tmp");
      } catch {
      }
      try {
        Module.FS.mkdir("/tmp/input");
      } catch {
      }
      try {
        Module.FS.mkdir("/tmp/output");
      } catch {
      }
      Module.FS.writeFile(inputPath, new Uint8Array(inputData));
      log("Input written");
      const lokClassPtr = readPtr(lokPtr);
      const loadFnPtr = readPtr(lokClassPtr + 8);
      const wasmTable = Module.wasmTable;
      const loadFn = wasmTable.get(loadFnPtr);
      const inputPathPtr = allocString(inputPath);
      const docPtr = loadFn(lokPtr, inputPathPtr);
      Module._free(inputPathPtr);
      if (docPtr === 0) throw new Error("Failed to load document");
      log("Document loaded");
      try {
        const docClassPtr = readPtr(docPtr);
        const saveFnPtr = readPtr(docClassPtr + 8);
        const saveFn = wasmTable.get(saveFnPtr);
        const outPathPtr = allocString(outputPath);
        const fmtPtr = allocString(outputFormat);
        const optPtr = allocString(filterOptions);
        const result = saveFn(docPtr, outPathPtr, fmtPtr, optPtr);
        Module._free(outPathPtr);
        Module._free(fmtPtr);
        Module._free(optPtr);
        if (result === 0) throw new Error("Failed to save");
        log("Document saved");
        const output = Module.FS.readFile(outputPath);
        try {
          Module.FS.unlink(inputPath);
        } catch {
        }
        try {
          Module.FS.unlink(outputPath);
        } catch {
        }
        return Array.from(output);
      } finally {
        const docClassPtr = readPtr(docPtr);
        const destroyFnPtr = readPtr(docClassPtr + 4);
        if (destroyFnPtr !== 0) {
          const destroyFn = wasmTable.get(destroyFnPtr);
          destroyFn(docPtr);
        }
      }
    }
    process.on("message", (msg) => {
      try {
        if (msg.type === "convert") {
          const { inputData, inputExt, outputFormat, filterOptions } = msg.payload;
          const result = convert(inputData, inputExt, outputFormat, filterOptions || "");
          process.send?.({ type: "response", id: msg.id, success: true, data: result });
        } else if (msg.type === "destroy") {
          if (lokPtr !== 0 && Module) {
            const lokClassPtr = readPtr(lokPtr);
            const destroyFnPtr = readPtr(lokClassPtr + 4);
            if (destroyFnPtr !== 0) {
              const wasmTable = Module.wasmTable;
              const destroyFn = wasmTable.get(destroyFnPtr);
              destroyFn(lokPtr);
            }
            lokPtr = 0;
          }
          initialized = false;
          process.send?.({ type: "response", id: msg.id, success: true });
          log("Destroy complete, exiting process");
          setImmediate(() => process.exit(0));
        }
      } catch (err) {
        process.send?.({ type: "response", id: msg.id, success: false, error: err.message });
      }
    });
    global.Module = {
      noInitialRun: true,
      locateFile: (f) => f,
      print: verbose ? console.log : () => {
      },
      printErr: verbose ? console.error : () => {
      }
    };
    log("Loading WASM module from:", wasmDir);
    var { createRequire } = __require("module");
    var nodeRequire = createRequire(__filename);
    nodeRequire(path__namespace.join(wasmDir, "soffice.cjs"));
    log("Module loaded, polling for ready state...");
    function checkReady() {
      Module = global.Module;
      if (Module._malloc && Module._libreofficekit_hook) {
        log("Module functions available");
        try {
          initLOK();
          process.send?.({ type: "ready" });
          log("Initialization complete");
        } catch (err) {
          log("Init error:", err);
          process.send?.({ type: "error", error: err.message });
        }
      } else {
        setTimeout(checkReady, 100);
      }
    }
    setTimeout(checkReady, 500);
    setInterval(() => {
    }, 6e4);
  }
});
var forkWorker = require_fork_worker();

module.exports = forkWorker;
//# sourceMappingURL=fork-worker.cjs.map
//# sourceMappingURL=fork-worker.cjs.map