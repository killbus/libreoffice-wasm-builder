'use strict';

var path = require('path');
var fs = require('fs');
var module$1 = require('module');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
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

// src/subprocess.cts
var Module = null;
var lokPtr = 0;
var initialized = false;
var NodeXMLHttpRequest = class {
  readyState = 0;
  status = 0;
  responseType = "";
  response = null;
  responseText = "";
  onload = null;
  onerror = null;
  onreadystatechange = null;
  _url = "";
  open(_method, url) {
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
async function initialize(payload) {
  if (initialized) return;
  const verbose = payload.verbose;
  global.XMLHttpRequest = NodeXMLHttpRequest;
  global.Module = {
    noInitialRun: true,
    print: verbose ? console.log : () => {
    },
    printErr: verbose ? console.error : () => {
    }
  };
  const require2 = module$1.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('subprocess.cjs', document.baseURI).href)));
  const sofficeModule = require2(path__namespace.join(process.cwd(), "soffice.cjs"));
  Module = global.Module || sofficeModule;
  const start = Date.now();
  const timeout = 12e4;
  while (!Module._malloc || !Module._libreofficekit_hook) {
    if (Date.now() - start > timeout) {
      throw new Error("WASM init timeout");
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  const pathPtr = allocString("/instdir/program");
  if (Module._lok_preinit) {
    Module._lok_preinit(pathPtr, 0);
  }
  lokPtr = Module._libreofficekit_hook(pathPtr);
  Module._free(pathPtr);
  if (lokPtr === 0) {
    throw new Error("Failed to init LOK");
  }
  initialized = true;
}
async function convert(payload) {
  if (!initialized || !Module || lokPtr === 0) {
    throw new Error("Not initialized");
  }
  const inputPath = `/tmp/input/doc.${payload.inputExt}`;
  const outputPath = `/tmp/output/doc.${payload.outputFormat}`;
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
  const inputData = new Uint8Array(payload.inputData);
  Module.FS.writeFile(inputPath, inputData);
  const lokClassPtr = readPtr(lokPtr);
  const loadFnPtr = readPtr(lokClassPtr + 8);
  const wasmTable = Module.wasmTable;
  const loadFn = wasmTable.get(loadFnPtr);
  const inputPathPtr = allocString(inputPath);
  const docPtr = loadFn(lokPtr, inputPathPtr);
  Module._free(inputPathPtr);
  if (docPtr === 0) {
    throw new Error("Failed to load document");
  }
  try {
    const docClassPtr = readPtr(docPtr);
    const saveFnPtr = readPtr(docClassPtr + 8);
    const saveFn = wasmTable.get(saveFnPtr);
    const outputPathPtr = allocString(outputPath);
    const formatPtr = allocString(payload.outputFormat);
    const optsPtr = allocString(payload.filterOptions);
    const result = saveFn(docPtr, outputPathPtr, formatPtr, optsPtr);
    Module._free(outputPathPtr);
    Module._free(formatPtr);
    Module._free(optsPtr);
    if (result === 0) {
      throw new Error("Failed to save document");
    }
    const outputData = Module.FS.readFile(outputPath);
    try {
      Module.FS.unlink(inputPath);
    } catch {
    }
    try {
      Module.FS.unlink(outputPath);
    } catch {
    }
    return Array.from(outputData);
  } finally {
    const docClassPtr = readPtr(docPtr);
    const destroyFnPtr = readPtr(docClassPtr + 4);
    if (destroyFnPtr !== 0) {
      const destroyFn = wasmTable.get(destroyFnPtr);
      destroyFn(docPtr);
    }
  }
}
process.on("message", async (msg) => {
  try {
    switch (msg.type) {
      case "init":
        await initialize(msg.payload);
        process.send?.({ type: "response", id: msg.id, success: true });
        break;
      case "convert":
        const result = await convert(msg.payload);
        process.send?.({ type: "response", id: msg.id, success: true, data: result });
        break;
      case "destroy":
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
        break;
    }
  } catch (error) {
    process.send?.({
      type: "response",
      id: msg.id,
      success: false,
      error: error.message
    });
  }
});
process.send?.({ type: "ready" });
//# sourceMappingURL=subprocess.cjs.map
//# sourceMappingURL=subprocess.cjs.map