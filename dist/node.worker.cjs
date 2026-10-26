'use strict';

var module$1 = require('module');
var fs = require('fs');
var os = require('os');
var path = require('path');
var worker_threads = require('worker_threads');

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

var fs__namespace = /*#__PURE__*/_interopNamespace(fs);
var os__namespace = /*#__PURE__*/_interopNamespace(os);
var path__namespace = /*#__PURE__*/_interopNamespace(path);

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/font-loader.ts
var font_loader_exports = {};
__export(font_loader_exports, {
  loadFontsFromDirectory: () => loadFontsFromDirectory,
  loadFontsFromPackage: () => loadFontsFromPackage,
  loadFontsFromPackages: () => loadFontsFromPackages,
  loadFontsFromZip: () => loadFontsFromZip,
  loadSystemFonts: () => loadSystemFonts
});
function isFontFile(filename) {
  const lower = filename.toLowerCase();
  return FONT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
function getBasename(filepath) {
  return filepath.split("/").pop() || filepath;
}
async function loadFontsFromZip(zipPath) {
  let JSZipModule;
  try {
    JSZipModule = await import('jszip');
  } catch {
    throw new Error("jszip is required for loadFontsFromZip. Install it: npm install jszip");
  }
  const JSZip = JSZipModule.default || JSZipModule;
  const zipData = fs__namespace.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipData);
  const fonts = [];
  for (const [filePath, entry] of Object.entries(zip.files)) {
    const zipEntry = entry;
    if (zipEntry.dir) continue;
    if (!isFontFile(filePath)) continue;
    const data = await zipEntry.async("uint8array");
    fonts.push({
      filename: getBasename(filePath),
      data
    });
  }
  return fonts;
}
async function loadFontsFromDirectory(dirPath) {
  const files = fs__namespace.readdirSync(dirPath);
  const fonts = [];
  for (const file of files) {
    if (!isFontFile(file)) continue;
    const fullPath = path__namespace.join(dirPath, file);
    const data = fs__namespace.readFileSync(fullPath);
    fonts.push({
      filename: file,
      data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    });
  }
  return fonts;
}
function collectFontsRecursive(dirPath, fonts) {
  let entries;
  try {
    entries = fs__namespace.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path__namespace.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFontsRecursive(fullPath, fonts);
    } else if (entry.isFile() && isFontFile(entry.name)) {
      try {
        const data = fs__namespace.readFileSync(fullPath);
        fonts.push({
          filename: entry.name,
          data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        });
      } catch {
      }
    }
  }
}
async function loadSystemFonts() {
  const platform2 = os__namespace.platform();
  const dirs = SYSTEM_FONT_DIRS[platform2];
  if (!dirs) {
    throw new Error(`Unsupported platform for system font loading: ${platform2}`);
  }
  const fonts = [];
  for (const dir of dirs) {
    collectFontsRecursive(dir, fonts);
  }
  const seen = /* @__PURE__ */ new Set();
  return fonts.filter((f) => {
    const lower = f.filename.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}
async function loadFontsFromPackage(packageName, options) {
  const formats = (options?.formats ?? FONT_EXTENSIONS).map((f) => f.toLowerCase());
  const require2 = module$1.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('node.worker.cjs', document.baseURI).href)));
  let pkgJsonPath;
  try {
    pkgJsonPath = require2.resolve(packageName + "/package.json");
  } catch {
    throw new Error(
      `Cannot find package '${packageName}'. Install it first: npm install ${packageName}`
    );
  }
  const pkgRoot = path__namespace.dirname(pkgJsonPath);
  const filesDir = path__namespace.join(pkgRoot, "files");
  if (!fs__namespace.existsSync(filesDir)) {
    throw new Error(
      `Package '${packageName}' has no files/ directory at ${filesDir}`
    );
  }
  const fonts = [];
  const entries = fs__namespace.readdirSync(filesDir);
  for (const entry of entries) {
    const ext = path__namespace.extname(entry).toLowerCase();
    if (!formats.includes(ext)) continue;
    const fullPath = path__namespace.join(filesDir, entry);
    try {
      const data = fs__namespace.readFileSync(fullPath);
      fonts.push({
        filename: entry,
        data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      });
    } catch {
    }
  }
  return fonts;
}
async function loadFontsFromPackages(packageNames, options) {
  const allFonts = [];
  for (const pkg of packageNames) {
    const fonts = await loadFontsFromPackage(pkg, options);
    allFonts.push(...fonts);
  }
  const seen = /* @__PURE__ */ new Set();
  return allFonts.filter((f) => {
    const lower = f.filename.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}
var FONT_EXTENSIONS, SYSTEM_FONT_DIRS;
var init_font_loader = __esm({
  "src/font-loader.ts"() {
    FONT_EXTENSIONS = [".ttf", ".otf", ".ttc", ".woff", ".woff2"];
    SYSTEM_FONT_DIRS = {
      linux: [
        "/usr/share/fonts",
        "/usr/local/share/fonts",
        path__namespace.join(os__namespace.homedir(), ".fonts"),
        path__namespace.join(os__namespace.homedir(), ".local/share/fonts")
      ],
      darwin: [
        "/System/Library/Fonts",
        "/Library/Fonts",
        path__namespace.join(os__namespace.homedir(), "Library/Fonts")
      ],
      win32: [
        path__namespace.join(process.env.WINDIR || "C:\\Windows", "Fonts")
      ]
    };
  }
});

// src/types.ts
var PDFA_LEVEL_TO_VERSION = {
  "PDF/A-1b": 1,
  "PDF/A-2b": 2,
  "PDF/A-3b": 3
};
function buildPdfFilterOptions(pdf) {
  if (!pdf) return "";
  const filterData = {};
  if (pdf.pdfaLevel) {
    filterData.SelectPdfVersion = {
      type: "long",
      value: String(PDFA_LEVEL_TO_VERSION[pdf.pdfaLevel] ?? 0)
    };
  }
  if (pdf.quality !== void 0) {
    filterData.Quality = {
      type: "long",
      value: String(pdf.quality)
    };
  }
  return Object.keys(filterData).length > 0 ? JSON.stringify(filterData) : "";
}
var ConversionError = class extends Error {
  code;
  details;
  constructor(code, message, details) {
    super(message);
    this.name = "ConversionError";
    this.code = code;
    this.details = details;
  }
};
var FORMAT_FILTERS = {
  pdf: "writer_pdf_Export",
  docx: "MS Word 2007 XML",
  doc: "MS Word 97",
  odt: "writer8",
  rtf: "Rich Text Format",
  txt: "Text",
  html: "HTML (StarWriter)",
  xlsx: "Calc MS Excel 2007 XML",
  xls: "MS Excel 97",
  ods: "calc8",
  csv: "Text - txt - csv (StarCalc)",
  pptx: "Impress MS PowerPoint 2007 XML",
  ppt: "MS PowerPoint 97",
  odp: "impress8",
  png: "writer_png_Export",
  svg: "writer_svg_Export"
};
var DOC_TYPE_FILTERS = {
  [0 /* TEXT */]: {
    pdf: "writer_pdf_Export",
    png: "writer_png_Export",
    svg: "writer_svg_Export"
  },
  [1 /* SPREADSHEET */]: {
    pdf: "calc_pdf_Export",
    png: "calc_png_Export",
    svg: "calc_svg_Export",
    html: "HTML (StarCalc)"
  },
  [2 /* PRESENTATION */]: {
    pdf: "impress_pdf_Export",
    png: "impress_png_Export",
    svg: "impress_svg_Export",
    html: "impress_html_Export"
  },
  [3 /* DRAWING */]: {
    pdf: "draw_pdf_Export",
    png: "draw_png_Export",
    svg: "draw_svg_Export",
    html: "draw_html_Export"
  },
  [4 /* OTHER */]: {
    pdf: "writer_pdf_Export",
    png: "writer_png_Export",
    svg: "writer_svg_Export"
  }
};
var FORMAT_MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  txt: "text/plain",
  html: "text/html",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  csv: "text/csv",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  odp: "application/vnd.oasis.opendocument.presentation",
  png: "image/png",
  svg: "image/svg+xml"
};
var EXTENSION_TO_FORMAT = {
  doc: "doc",
  docx: "docx",
  xls: "xls",
  xlsx: "xlsx",
  ppt: "ppt",
  pptx: "pptx",
  odt: "odt",
  ods: "ods",
  odp: "odp",
  odg: "odg",
  odf: "odf",
  rtf: "rtf",
  txt: "txt",
  html: "html",
  htm: "html",
  csv: "csv",
  xml: "xml",
  epub: "epub",
  pdf: "pdf"
};
var LOK_DOCTYPE_OUTPUT_FORMATS = {
  [0 /* TEXT */]: ["pdf", "docx", "doc", "odt", "rtf", "txt", "png"],
  [1 /* SPREADSHEET */]: ["pdf", "xlsx", "xls", "ods", "csv", "html", "png"],
  [2 /* PRESENTATION */]: ["pdf", "pptx", "ppt", "odp", "png", "svg", "html"],
  [3 /* DRAWING */]: ["pdf", "png", "svg", "html"],
  [4 /* OTHER */]: ["pdf"]
};
function getOutputFormatsForDocType(docType) {
  return LOK_DOCTYPE_OUTPUT_FORMATS[docType] || ["pdf"];
}
var OUTPUT_FORMAT_TO_LOK = {
  pdf: "pdf",
  docx: "docx",
  doc: "doc",
  odt: "odt",
  rtf: "rtf",
  txt: "txt",
  html: "html",
  xlsx: "xlsx",
  xls: "xls",
  ods: "ods",
  csv: "csv",
  pptx: "pptx",
  ppt: "ppt",
  odp: "odp",
  png: "png",
  svg: "svg"
};
var FORMAT_FILTER_OPTIONS = {
  // PDF export options must be JSON FilterData (see buildPdfFilterOptions):
  // - SelectPdfVersion (0=PDF 1.4, 1=PDF/A-1, 2=PDF/A-2, 3=PDF/A-3)
  // - Quality
  pdf: "",
  // CSV can specify separator, encoding, etc.
  csv: "44,34,76,1,,0,false,true,false,false,false,0",
  // Text encoding
  txt: "UTF8"
};
var CSV_EXPORT_SHEET_TOKEN_INDEX = 11;
function resolveSingleResultFilterOptions(outputFormat, filterOptions) {
  if (outputFormat.toLowerCase() !== "csv") return filterOptions;
  const effectiveOptions = filterOptions ?? FORMAT_FILTER_OPTIONS.csv ?? "";
  const sheetToken = effectiveOptions.split(",")[CSV_EXPORT_SHEET_TOKEN_INDEX];
  if (sheetToken === void 0 || sheetToken === "" || sheetToken === "0") {
    return effectiveOptions;
  }
  throw new ConversionError(
    "INVALID_INPUT" /* INVALID_INPUT */,
    `CSV single-result conversion requires filter option token 11 to be empty or 0; received ${JSON.stringify(sheetToken)}`
  );
}
var CSV_IMPORT_FILTER_OPTIONS = "FilterName=Text - txt - csv (StarCalc),FilterOptions=44,34,76,1,,1033,false,true,false,false,false,0,true,false,true";
function buildLoadOptions(inputFormat, password) {
  const options = [];
  if (inputFormat?.toLowerCase() === "csv") {
    options.push(CSV_IMPORT_FILTER_OPTIONS);
  }
  if (password) {
    options.push(`Password=${password}`);
  }
  return options.join(",");
}
var INPUT_FORMAT_CATEGORY = {
  // Text/Writer documents
  doc: "text",
  docx: "text",
  odt: "text",
  rtf: "text",
  txt: "text",
  html: "text",
  htm: "text",
  epub: "text",
  xml: "text",
  // Spreadsheet/Calc documents
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  ods: "spreadsheet",
  csv: "spreadsheet",
  // Presentation/Impress documents
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  // Drawing/Draw documents (PDF imports as Draw)
  odg: "drawing",
  odf: "drawing",
  pdf: "drawing"
  // PDFs are imported as Draw documents
};
var CATEGORY_OUTPUT_FORMATS = {
  // Writer documents can export to (based on aWriterExtensionMap in init.cxx):
  // NOTE: jpg and svg are NOT supported for Writer - only png for images
  text: ["pdf", "docx", "doc", "odt", "rtf", "txt", "png"],
  // Calc documents can export to (based on aCalcExtensionMap in init.cxx):
  // NOTE: jpg and svg are NOT supported for Calc - only png for images
  spreadsheet: ["pdf", "xlsx", "xls", "ods", "csv", "html", "png"],
  // Impress documents can export to (based on aImpressExtensionMap in init.cxx):
  // NOTE: jpg is NOT supported - only png and svg for images
  presentation: ["pdf", "pptx", "ppt", "odp", "png", "svg", "html"],
  // Draw documents (including imported PDFs) can export to (based on aDrawExtensionMap in init.cxx):
  // NOTE: jpg is NOT supported - only png and svg for images
  drawing: ["pdf", "png", "svg", "html"],
  // Other/unknown - try PDF only
  other: ["pdf"]
};
function getValidOutputFormats(inputFormat) {
  const format = inputFormat.toLowerCase();
  const category = INPUT_FORMAT_CATEGORY[format];
  if (!category) {
    return ["pdf"];
  }
  return CATEGORY_OUTPUT_FORMATS[category];
}
function isConversionValid(inputFormat, outputFormat) {
  const validOutputs = getValidOutputFormats(inputFormat);
  return validOutputs.includes(outputFormat.toLowerCase());
}
function getConversionErrorMessage(inputFormat, outputFormat) {
  const input = inputFormat.toLowerCase();
  const output = outputFormat.toLowerCase();
  const validOutputs = getValidOutputFormats(input);
  const category = INPUT_FORMAT_CATEGORY[input] || "unknown";
  let reason = "";
  if (category === "drawing" && ["docx", "doc", "xlsx", "xls", "pptx", "ppt"].includes(output)) {
    reason = `PDF files are imported as Draw documents and cannot be exported to Office formats. `;
  } else if (category === "spreadsheet" && ["docx", "doc", "pptx", "ppt"].includes(output)) {
    reason = `Spreadsheet documents cannot be converted to word processing or presentation formats. `;
  } else if (category === "presentation" && ["docx", "doc", "xlsx", "xls"].includes(output)) {
    reason = `Presentation documents cannot be converted to word processing or spreadsheet formats. `;
  } else if (category === "text" && ["xlsx", "xls", "pptx", "ppt"].includes(output)) {
    reason = `Text documents cannot be converted to spreadsheet or presentation formats. `;
  }
  return `Cannot convert ${input.toUpperCase()} to ${output.toUpperCase()}. ${reason}Valid output formats for ${input.toUpperCase()}: ${validOutputs.join(", ")}`;
}

// src/native-conversion-bridge.ts
var NATIVE_CONVERSION_SCHEMA_VERSION = 1;
var NATIVE_CONVERSION_STAGES = [
  "validate",
  "load",
  "export",
  "cleanup",
  "complete"
];
var NATIVE_CONVERSION_CLEANUP_STATES = [
  "not-needed",
  "clean",
  "uncertain"
];
var NATIVE_FILTER_DATA_TYPES = [
  "string",
  "boolean",
  "float",
  "long",
  "short",
  "unsigned short",
  "int64",
  "int32",
  "int16",
  "uint64",
  "uint32",
  "uint16"
];
var NATIVE_CONVERSION_RUNTIME_NOT_READY_MESSAGE = "LibreOffice runtime is not ready for conversion";
var DEFAULT_NATIVE_CONVERSION_READY_TIMEOUT_MS = 5e3;
var DEFAULT_NATIVE_CONVERSION_READY_RETRY_DELAY_MS = 25;
var NativeConversionError = class extends Error {
  kind;
  runtimeReusable;
  result;
  boundaryCause;
  constructor(kind, message, runtimeReusable, result, boundaryCause) {
    super(message);
    this.name = "NativeConversionError";
    this.kind = kind;
    this.runtimeReusable = runtimeReusable;
    this.result = result;
    this.boundaryCause = boundaryCause;
  }
};
var ABSOLUTE_URL_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;
var FILTER_DATA_TYPE_SET = new Set(NATIVE_FILTER_DATA_TYPES);
var STAGE_SET = new Set(NATIVE_CONVERSION_STAGES);
var CLEANUP_SET = new Set(NATIVE_CONVERSION_CLEANUP_STATES);
var CATEGORY_DOCUMENT_TYPES = {
  text: 0 /* TEXT */,
  spreadsheet: 1 /* SPREADSHEET */,
  presentation: 2 /* PRESENTATION */,
  drawing: 3 /* DRAWING */,
  other: 4 /* OTHER */
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
function contractFailure(message, runtimeReusable = true) {
  throw new NativeConversionError("contract", message, runtimeReusable);
}
function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    return contractFailure(`${field} must be a non-empty string`);
  }
  return value;
}
function requireNullableString(value, field) {
  if (value !== null && typeof value !== "string") {
    return contractFailure(`${field} must be a string or null`);
  }
  return value;
}
function requireAbsoluteUrl(value, field) {
  const url = requireNonEmptyString(value, field);
  if (!ABSOLUTE_URL_PATTERN.test(url)) {
    return contractFailure(`${field} must be an absolute URL`);
  }
  return url;
}
function validateFilterData(value) {
  if (!isRecord(value)) {
    contractFailure("filterData must be an object");
  }
  for (const [name, entry] of Object.entries(value)) {
    if (name.length === 0 || !isRecord(entry)) {
      contractFailure("Each filterData entry must have a non-empty name and object value");
    }
    const keys = Object.keys(entry);
    if (keys.length !== 2 || !hasOwn(entry, "type") || !hasOwn(entry, "value")) {
      contractFailure(`filterData.${name} must contain only type and value`);
    }
    if (typeof entry.type !== "string" || !FILTER_DATA_TYPE_SET.has(entry.type)) {
      contractFailure(`filterData.${name}.type is not supported`);
    }
    if (typeof entry.value !== "string") {
      contractFailure(`filterData.${name}.value must be a string`);
    }
  }
}
function normalizeLibreOfficeUrl(pathOrUrl) {
  if (typeof pathOrUrl !== "string" || pathOrUrl.length === 0) {
    return contractFailure("LibreOffice conversion path must be a non-empty string");
  }
  if (ABSOLUTE_URL_PATTERN.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const absolutePath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `file://${absolutePath}`;
}
function resolveLibreOfficeExportFilter(inputFormat, outputFormat) {
  if (typeof inputFormat !== "string" || inputFormat.length === 0) {
    return contractFailure("Input format must be a non-empty string");
  }
  if (typeof outputFormat !== "string" || outputFormat.length === 0) {
    return contractFailure("Output format must be a non-empty string");
  }
  const normalizedInput = inputFormat.toLowerCase();
  const normalizedOutput = outputFormat.toLowerCase();
  if (!hasOwn(INPUT_FORMAT_CATEGORY, normalizedInput)) {
    return contractFailure(`Unsupported input format: ${inputFormat}`);
  }
  if (!hasOwn(FORMAT_FILTERS, normalizedOutput)) {
    return contractFailure(`Unsupported output format: ${outputFormat}`);
  }
  const typedInput = normalizedInput;
  const typedOutput = normalizedOutput;
  const category = INPUT_FORMAT_CATEGORY[typedInput];
  if (!CATEGORY_OUTPUT_FORMATS[category].includes(typedOutput)) {
    return contractFailure(`Unsupported conversion: ${typedInput} -> ${typedOutput}`);
  }
  const documentType = CATEGORY_DOCUMENT_TYPES[category];
  const filter = DOC_TYPE_FILTERS[documentType][typedOutput] ?? FORMAT_FILTERS[typedOutput];
  if (!filter) {
    return contractFailure(`No LibreOffice export filter for ${typedInput} -> ${typedOutput}`);
  }
  return filter;
}
function parseFilterData(filterOptions) {
  let parsed;
  try {
    parsed = JSON.parse(filterOptions);
  } catch (error) {
    throw new NativeConversionError(
      "contract",
      "FilterData JSON is malformed",
      true,
      void 0,
      error
    );
  }
  validateFilterData(parsed);
  return parsed;
}
function resolveOutputOptions(outputFormat, filterOptions, pdf) {
  let effectiveOptions;
  const singleResultOptions = resolveSingleResultFilterOptions(outputFormat, filterOptions);
  if (singleResultOptions !== void 0) {
    effectiveOptions = singleResultOptions;
  } else if (outputFormat === "pdf" && pdf) {
    effectiveOptions = buildPdfFilterOptions(pdf) || FORMAT_FILTER_OPTIONS[outputFormat] || "";
  } else {
    effectiveOptions = FORMAT_FILTER_OPTIONS[outputFormat] || "";
  }
  if (effectiveOptions.trimStart().startsWith("{")) {
    return {
      outputFilterOptions: null,
      filterData: parseFilterData(effectiveOptions)
    };
  }
  return {
    outputFilterOptions: effectiveOptions.length > 0 ? effectiveOptions : null,
    filterData: {}
  };
}
function resolveCsvInputOptions() {
  const match = /^FilterName=([^,]+),FilterOptions=(.*)$/s.exec(CSV_IMPORT_FILTER_OPTIONS);
  if (!match?.[1] || match[2] === void 0) {
    return contractFailure("CSV_IMPORT_FILTER_OPTIONS has an invalid internal shape");
  }
  return {
    inputFilter: match[1],
    inputFilterOptions: match[2]
  };
}
function createNativeConversionRequest(parameters) {
  if (typeof parameters.inputFormat !== "string" || typeof parameters.outputFormat !== "string") {
    return contractFailure("Input and output formats must be strings");
  }
  const normalizedInput = parameters.inputFormat.toLowerCase();
  const normalizedOutput = parameters.outputFormat.toLowerCase();
  const outputFilter = resolveLibreOfficeExportFilter(normalizedInput, normalizedOutput);
  const typedOutput = normalizedOutput;
  const inputOptions = normalizedInput === "csv" ? resolveCsvInputOptions() : { inputFilter: null, inputFilterOptions: null };
  const outputOptions = resolveOutputOptions(
    typedOutput,
    parameters.filterOptions,
    parameters.pdf
  );
  return {
    schemaVersion: NATIVE_CONVERSION_SCHEMA_VERSION,
    inputUrl: normalizeLibreOfficeUrl(parameters.inputPath),
    outputUrl: normalizeLibreOfficeUrl(parameters.outputPath),
    ...inputOptions,
    password: parameters.password && parameters.password.length > 0 ? parameters.password : null,
    outputFilter,
    ...outputOptions
  };
}
function encodeNativeConversionRequest(request) {
  if (!isRecord(request)) {
    return contractFailure("Native conversion request must be an object");
  }
  if (request.schemaVersion !== NATIVE_CONVERSION_SCHEMA_VERSION) {
    return contractFailure("Unsupported native conversion request schemaVersion");
  }
  requireAbsoluteUrl(request.inputUrl, "inputUrl");
  requireAbsoluteUrl(request.outputUrl, "outputUrl");
  requireNullableString(request.inputFilter, "inputFilter");
  requireNullableString(request.inputFilterOptions, "inputFilterOptions");
  requireNullableString(request.password, "password");
  requireNonEmptyString(request.outputFilter, "outputFilter");
  requireNullableString(request.outputFilterOptions, "outputFilterOptions");
  validateFilterData(request.filterData);
  try {
    return JSON.stringify(request);
  } catch (error) {
    throw new NativeConversionError(
      "contract",
      "Native conversion request could not be encoded",
      true,
      void 0,
      error
    );
  }
}
function decodeNativeConversionResult(value) {
  if (!isRecord(value)) {
    return contractFailure("Native conversion result must be an object", false);
  }
  if (value.schemaVersion !== NATIVE_CONVERSION_SCHEMA_VERSION) {
    return contractFailure("Unsupported native conversion result schemaVersion", false);
  }
  if (typeof value.ok !== "boolean") {
    return contractFailure("Native conversion result ok must be a boolean", false);
  }
  if (typeof value.stage !== "string" || !STAGE_SET.has(value.stage)) {
    return contractFailure("Native conversion result stage is invalid", false);
  }
  if (typeof value.cleanup !== "string" || !CLEANUP_SET.has(value.cleanup)) {
    return contractFailure("Native conversion result cleanup is invalid", false);
  }
  if (typeof value.hiddenLoad !== "boolean") {
    return contractFailure("Native conversion result hiddenLoad must be a boolean", false);
  }
  if (typeof value.visibleFrameSetupEntered !== "boolean") {
    return contractFailure(
      "Native conversion result visibleFrameSetupEntered must be a boolean",
      false
    );
  }
  if (value.message !== void 0 && typeof value.message !== "string") {
    return contractFailure("Native conversion result message must be a string", false);
  }
  const result = {
    schemaVersion: NATIVE_CONVERSION_SCHEMA_VERSION,
    ok: value.ok,
    stage: value.stage,
    cleanup: value.cleanup,
    hiddenLoad: value.hiddenLoad,
    visibleFrameSetupEntered: value.visibleFrameSetupEntered,
    ...value.message === void 0 ? {} : { message: value.message }
  };
  if (result.ok) {
    if (result.stage !== "complete" || result.cleanup !== "clean" || !result.hiddenLoad || result.visibleFrameSetupEntered) {
      return contractFailure("Native conversion success invariants were not satisfied", false);
    }
  } else if (result.stage === "complete") {
    return contractFailure("Native conversion failure cannot have stage=complete", false);
  }
  if (result.cleanup === "uncertain" && result.stage !== "cleanup") {
    return contractFailure("cleanup=uncertain requires stage=cleanup", false);
  }
  return result;
}
function isNativeConversionRuntimeReusable(result) {
  return result.cleanup !== "uncertain";
}
function isNativeConversionRuntimeNotReady(result) {
  return !result.ok && result.stage === "validate" && result.cleanup === "not-needed" && !result.hiddenLoad && !result.visibleFrameSetupEntered && result.message === NATIVE_CONVERSION_RUNTIME_NOT_READY_MESSAGE;
}
async function runNativeConversionWhenReady(convert, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_NATIVE_CONVERSION_READY_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_NATIVE_CONVERSION_READY_RETRY_DELAY_MS;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new RangeError("Native conversion ready timeout must be a non-negative finite number");
  }
  if (!Number.isFinite(retryDelayMs) || retryDelayMs <= 0) {
    throw new RangeError("Native conversion retry delay must be a positive finite number");
  }
  const startedAt = now();
  while (true) {
    const result = convert();
    if (!isNativeConversionRuntimeNotReady(result)) {
      return result;
    }
    const elapsedMs = Math.max(0, now() - startedAt);
    const remainingMs = timeoutMs - elapsedMs;
    if (remainingMs <= 0) {
      throw new NativeConversionError(
        "conversion",
        `LibreOffice runtime did not become ready for conversion within ${timeoutMs} ms`,
        true,
        result
      );
    }
    await sleep(Math.min(retryDelayMs, remainingMs));
  }
}
function assertNativeConversionSucceeded(result) {
  if (!result.ok) {
    throw new NativeConversionError(
      "conversion",
      result.message || `Native conversion failed during ${result.stage}`,
      isNativeConversionRuntimeReusable(result),
      result
    );
  }
}

// src/lok-bindings.ts
var LOK_MOUSEEVENT_BUTTONDOWN = 0;
var LOK_MOUSEEVENT_BUTTONUP = 1;
var LOK_CALLBACK_INVALIDATE_TILES = 0;
var LOK_CALLBACK_INVALIDATE_VISIBLE_CURSOR = 1;
var LOK_CALLBACK_TEXT_SELECTION = 2;
var LOK_CALLBACK_TEXT_SELECTION_START = 3;
var LOK_CALLBACK_TEXT_SELECTION_END = 4;
var LOK_CALLBACK_CURSOR_VISIBLE = 5;
var LOK_CALLBACK_GRAPHIC_SELECTION = 6;
var LOK_CALLBACK_HYPERLINK_CLICKED = 7;
var LOK_CALLBACK_STATE_CHANGED = 8;
var LOK_CALLBACK_STATUS_INDICATOR_START = 9;
var LOK_CALLBACK_STATUS_INDICATOR_SET_VALUE = 10;
var LOK_CALLBACK_STATUS_INDICATOR_FINISH = 11;
var LOK_CALLBACK_SEARCH_NOT_FOUND = 12;
var LOK_CALLBACK_DOCUMENT_SIZE_CHANGED = 13;
var LOK_CALLBACK_SET_PART = 14;
var LOK_CALLBACK_SEARCH_RESULT_SELECTION = 15;
var LOK_CALLBACK_UNO_COMMAND_RESULT = 16;
var LOK_CALLBACK_CELL_CURSOR = 17;
var LOK_CALLBACK_MOUSE_POINTER = 18;
var LOK_CALLBACK_CELL_FORMULA = 19;
var LOK_CALLBACK_DOCUMENT_PASSWORD = 20;
var LOK_CALLBACK_DOCUMENT_PASSWORD_TO_MODIFY = 21;
var LOK_CALLBACK_CONTEXT_MENU = 22;
var LOK_CALLBACK_INVALIDATE_VIEW_CURSOR = 23;
var LOK_CALLBACK_TEXT_VIEW_SELECTION = 24;
var LOK_CALLBACK_CELL_VIEW_CURSOR = 25;
var LOK_CALLBACK_GRAPHIC_VIEW_SELECTION = 26;
var LOK_CALLBACK_VIEW_CURSOR_VISIBLE = 27;
var LOK_CALLBACK_VIEW_LOCK = 28;
var LOK_CALLBACK_REDLINE_TABLE_SIZE_CHANGED = 29;
var LOK_CALLBACK_REDLINE_TABLE_ENTRY_MODIFIED = 30;
var LOK_CALLBACK_COMMENT = 31;
var LOK_CALLBACK_INVALIDATE_HEADER = 32;
var LOK_CALLBACK_CELL_ADDRESS = 33;
function getCallbackTypeName(type) {
  const names = {
    [LOK_CALLBACK_INVALIDATE_TILES]: "INVALIDATE_TILES",
    [LOK_CALLBACK_INVALIDATE_VISIBLE_CURSOR]: "INVALIDATE_VISIBLE_CURSOR",
    [LOK_CALLBACK_TEXT_SELECTION]: "TEXT_SELECTION",
    [LOK_CALLBACK_TEXT_SELECTION_START]: "TEXT_SELECTION_START",
    [LOK_CALLBACK_TEXT_SELECTION_END]: "TEXT_SELECTION_END",
    [LOK_CALLBACK_CURSOR_VISIBLE]: "CURSOR_VISIBLE",
    [LOK_CALLBACK_GRAPHIC_SELECTION]: "GRAPHIC_SELECTION",
    [LOK_CALLBACK_HYPERLINK_CLICKED]: "HYPERLINK_CLICKED",
    [LOK_CALLBACK_STATE_CHANGED]: "STATE_CHANGED",
    [LOK_CALLBACK_STATUS_INDICATOR_START]: "STATUS_INDICATOR_START",
    [LOK_CALLBACK_STATUS_INDICATOR_SET_VALUE]: "STATUS_INDICATOR_SET_VALUE",
    [LOK_CALLBACK_STATUS_INDICATOR_FINISH]: "STATUS_INDICATOR_FINISH",
    [LOK_CALLBACK_SEARCH_NOT_FOUND]: "SEARCH_NOT_FOUND",
    [LOK_CALLBACK_DOCUMENT_SIZE_CHANGED]: "DOCUMENT_SIZE_CHANGED",
    [LOK_CALLBACK_SET_PART]: "SET_PART",
    [LOK_CALLBACK_SEARCH_RESULT_SELECTION]: "SEARCH_RESULT_SELECTION",
    [LOK_CALLBACK_UNO_COMMAND_RESULT]: "UNO_COMMAND_RESULT",
    [LOK_CALLBACK_CELL_CURSOR]: "CELL_CURSOR",
    [LOK_CALLBACK_MOUSE_POINTER]: "MOUSE_POINTER",
    [LOK_CALLBACK_CELL_FORMULA]: "CELL_FORMULA",
    [LOK_CALLBACK_DOCUMENT_PASSWORD]: "DOCUMENT_PASSWORD",
    [LOK_CALLBACK_DOCUMENT_PASSWORD_TO_MODIFY]: "DOCUMENT_PASSWORD_TO_MODIFY",
    [LOK_CALLBACK_CONTEXT_MENU]: "CONTEXT_MENU",
    [LOK_CALLBACK_INVALIDATE_VIEW_CURSOR]: "INVALIDATE_VIEW_CURSOR",
    [LOK_CALLBACK_TEXT_VIEW_SELECTION]: "TEXT_VIEW_SELECTION",
    [LOK_CALLBACK_CELL_VIEW_CURSOR]: "CELL_VIEW_CURSOR",
    [LOK_CALLBACK_GRAPHIC_VIEW_SELECTION]: "GRAPHIC_VIEW_SELECTION",
    [LOK_CALLBACK_VIEW_CURSOR_VISIBLE]: "VIEW_CURSOR_VISIBLE",
    [LOK_CALLBACK_VIEW_LOCK]: "VIEW_LOCK",
    [LOK_CALLBACK_REDLINE_TABLE_SIZE_CHANGED]: "REDLINE_TABLE_SIZE_CHANGED",
    [LOK_CALLBACK_REDLINE_TABLE_ENTRY_MODIFIED]: "REDLINE_TABLE_ENTRY_MODIFIED",
    [LOK_CALLBACK_COMMENT]: "COMMENT",
    [LOK_CALLBACK_INVALIDATE_HEADER]: "INVALIDATE_HEADER",
    [LOK_CALLBACK_CELL_ADDRESS]: "CELL_ADDRESS"
  };
  return names[type] || `UNKNOWN(${type})`;
}
var LOK_CLASS = {
  nSize: 0,
  destroy: 4,
  documentLoad: 8,
  getError: 12,
  documentLoadWithOptions: 16,
  freeError: 20
};
var DOC_CLASS = {
  nSize: 0,
  destroy: 4,
  saveAs: 8
};
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder();
function nativeAbiFailure(message, boundaryCause, result) {
  return new NativeConversionError("abi", message, false, result, boundaryCause);
}
var LOKBindings = class {
  module;
  lokPtr = 0;
  verbose;
  useShims;
  constructor(module, verbose = false) {
    this.module = module;
    this.verbose = verbose;
    this.useShims = typeof this.module._lok_documentLoad === "function";
    if (this.useShims) {
      this.log("Using direct LOK shim exports");
    } else {
      this.log("Using vtable traversal (shims not available)");
    }
  }
  log(...args) {
    if (this.verbose) {
      console.log("[LOK]", ...args);
    }
  }
  supportsFontProfile() {
    return typeof this.module._lok_setFontProfile === "function" && typeof this.module._lok_setFontProfileFree === "function" && typeof this.module._lok_documentLoad === "function" && typeof this.module._lok_documentLoadWithOptions === "function" && typeof this.module._lok_documentDestroy === "function";
  }
  getIdentity() {
    return `lok:${this.lokPtr}`;
  }
  /**
   * Get fresh heap views (important after memory growth!)
   */
  get HEAPU8() {
    return this.module.HEAPU8;
  }
  get HEAPU32() {
    return this.module.HEAPU32;
  }
  get HEAP32() {
    return this.module.HEAP32;
  }
  /**
   * Allocate a null-terminated string in WASM memory
   */
  allocString(str) {
    const bytes = textEncoder.encode(str + "\0");
    const ptr = this.module._malloc(bytes.length);
    if (ptr === 0) {
      throw new Error(`WASM allocation failed for ${bytes.length} bytes`);
    }
    const heap = this.HEAPU8;
    if (!Number.isSafeInteger(ptr) || ptr < 0 || bytes.length > heap.length - ptr) {
      try {
        this.module._free(ptr);
      } catch {
      }
      throw new Error("WASM allocator returned an out-of-bounds pointer");
    }
    heap.set(bytes, ptr);
    return ptr;
  }
  /**
   * Read a null-terminated string from WASM memory
   */
  readString(ptr) {
    if (ptr === 0) return null;
    const heap = this.HEAPU8;
    if (!Number.isSafeInteger(ptr) || ptr < 0 || ptr >= heap.length) {
      throw new Error("WASM string pointer is out of bounds");
    }
    const end = heap.indexOf(0, ptr);
    if (end < 0) {
      throw new Error("WASM string is not null-terminated within memory bounds");
    }
    const slice = heap.slice(ptr, end);
    return textDecoder.decode(slice);
  }
  /**
   * Read a 32-bit pointer from memory (unsigned)
   */
  readPtr(addr) {
    return this.HEAPU32[addr >> 2] || 0;
  }
  allocateConversionResultSlot() {
    const slotSize = Uint32Array.BYTES_PER_ELEMENT;
    const ptr = this.module._malloc(slotSize);
    if (ptr === 0) {
      throw new Error("WASM allocation failed for native conversion result slot");
    }
    const byteHeap = this.HEAPU8;
    const pointerHeap = this.HEAPU32;
    const index = ptr / slotSize;
    if (!Number.isSafeInteger(ptr) || ptr < 0 || ptr % slotSize !== 0 || ptr > byteHeap.length - slotSize || index >= pointerHeap.length) {
      try {
        this.module._free(ptr);
      } catch {
      }
      throw new Error("WASM allocator returned an invalid result-slot pointer");
    }
    pointerHeap[index] = 0;
    return ptr;
  }
  readConversionResultPointer(slotPtr) {
    const slotSize = Uint32Array.BYTES_PER_ELEMENT;
    const byteHeap = this.HEAPU8;
    const pointerHeap = this.HEAPU32;
    const index = slotPtr / slotSize;
    if (!Number.isSafeInteger(slotPtr) || slotPtr < 0 || slotPtr % slotSize !== 0 || slotPtr > byteHeap.length - slotSize || index >= pointerHeap.length) {
      throw new Error("Native conversion result slot is out of bounds");
    }
    return pointerHeap[index] ?? 0;
  }
  /**
   * Get a function from the WASM table (fallback for vtable traversal)
   */
  getFunc(ptr) {
    const wasmTable = this.module.wasmTable;
    return wasmTable.get(ptr);
  }
  /**
   * Initialize LibreOfficeKit
   */
  initialize(installPath = "/instdir/program") {
    this.log("Initializing with path:", installPath);
    const pathPtr = this.allocString(installPath);
    try {
      const hook = this.module._libreofficekit_hook;
      if (typeof hook !== "function") {
        throw new Error("libreofficekit_hook export not found on module");
      }
      this.lokPtr = hook(pathPtr);
      if (this.lokPtr === 0) {
        throw new Error("Failed to initialize LibreOfficeKit");
      }
      this.log("LOK initialized, ptr:", this.lokPtr);
    } finally {
      this.module._free(pathPtr);
    }
  }
  /**
   * Get the last error message
   */
  getError() {
    if (this.lokPtr === 0) return null;
    if (this.useShims && this.module._lok_getError) {
      const errPtr2 = this.module._lok_getError(this.lokPtr);
      return this.readString(errPtr2);
    }
    const lokClassPtr = this.readPtr(this.lokPtr);
    const getErrorPtr = this.readPtr(lokClassPtr + LOK_CLASS.getError);
    if (getErrorPtr === 0) return null;
    const getError = this.getFunc(getErrorPtr);
    const errPtr = getError(this.lokPtr);
    return this.readString(errPtr);
  }
  /**
   * Get version info
   */
  getVersionInfo() {
    return "LibreOffice WASM";
  }
  /**
   * Run one basic conversion as an official hidden native transaction.
   */
  convertDocument(request) {
    if (this.lokPtr === 0) {
      throw nativeAbiFailure("LOK is not initialized for native conversion");
    }
    const nativeConvert = this.module._lok_convertDocument;
    const nativeFree = this.module._lok_convertFree;
    if (typeof nativeConvert !== "function" || typeof nativeFree !== "function") {
      throw nativeAbiFailure("Native conversion bridge exports are unavailable");
    }
    const requestJson = encodeNativeConversionRequest(request);
    let requestPtr = 0;
    let resultSlotPtr = 0;
    let resultPtr = 0;
    let resultPointerRead = false;
    let result;
    let primaryError;
    const cleanupErrors = [];
    try {
      try {
        requestPtr = this.allocString(requestJson);
      } catch (error) {
        throw nativeAbiFailure("Failed to allocate the native conversion request", error);
      }
      try {
        resultSlotPtr = this.allocateConversionResultSlot();
      } catch (error) {
        throw nativeAbiFailure("Failed to allocate the native conversion result slot", error);
      }
      let returnCode;
      try {
        returnCode = nativeConvert(this.lokPtr, requestPtr, resultSlotPtr);
      } catch (error) {
        throw nativeAbiFailure("Native conversion bridge trapped", error);
      }
      resultPointerRead = true;
      try {
        resultPtr = this.readConversionResultPointer(resultSlotPtr);
      } catch (error) {
        throw nativeAbiFailure("Native conversion result pointer is invalid", error);
      }
      if (!Number.isInteger(returnCode) || returnCode !== 0) {
        throw nativeAbiFailure(
          `Native conversion bridge returned ABI status ${String(returnCode)}`
        );
      }
      if (resultPtr === 0) {
        throw nativeAbiFailure("Native conversion bridge returned no result");
      }
      let decodedJson;
      try {
        const encodedResult = this.readString(resultPtr);
        if (encodedResult === null) {
          throw new Error("Native conversion result pointer was null");
        }
        decodedJson = JSON.parse(encodedResult);
      } catch (error) {
        throw nativeAbiFailure("Native conversion bridge returned malformed JSON", error);
      }
      try {
        result = decodeNativeConversionResult(decodedJson);
      } catch (error) {
        throw nativeAbiFailure(
          "Native conversion bridge returned an invalid result contract",
          error
        );
      }
    } catch (error) {
      primaryError = error instanceof NativeConversionError ? error : nativeAbiFailure("Native conversion bridge failed at the ABI boundary", error);
      if (resultSlotPtr !== 0 && !resultPointerRead) {
        resultPointerRead = true;
        try {
          resultPtr = this.readConversionResultPointer(resultSlotPtr);
        } catch (slotError) {
          cleanupErrors.push(slotError);
        }
      }
    } finally {
      if (resultPtr !== 0) {
        try {
          nativeFree(resultPtr);
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (requestPtr !== 0) {
        try {
          this.module._free(requestPtr);
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (resultSlotPtr !== 0) {
        try {
          this.module._free(resultSlotPtr);
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
    }
    if (cleanupErrors.length > 0) {
      const causes = primaryError ? [primaryError.boundaryCause ?? primaryError, ...cleanupErrors] : cleanupErrors;
      const boundaryCause = causes.length === 1 ? causes[0] : new AggregateError(causes, "Native conversion allocation cleanup failed");
      if (primaryError) {
        throw new NativeConversionError(
          primaryError.kind,
          primaryError.message,
          false,
          primaryError.result,
          boundaryCause
        );
      }
      throw nativeAbiFailure(
        "Native conversion allocation cleanup failed",
        boundaryCause,
        result
      );
    }
    if (primaryError) {
      throw primaryError;
    }
    if (!result) {
      throw nativeAbiFailure("Native conversion bridge produced no decoded result");
    }
    return result;
  }
  setFontProfile(request) {
    const nativeSetFontProfile = this.module._lok_setFontProfile;
    const nativeFree = this.module._lok_setFontProfileFree;
    if (typeof nativeSetFontProfile !== "function" || typeof nativeFree !== "function") return null;
    if (this.lokPtr === 0) {
      throw new Error("LOK is not initialized for font profile mutation");
    }
    let requestPtr = 0;
    let resultPtr = 0;
    try {
      requestPtr = this.allocString(JSON.stringify(request));
      resultPtr = nativeSetFontProfile(this.lokPtr, requestPtr);
      if (resultPtr === 0) {
        throw new Error("Native font profile bridge returned no result");
      }
      const encodedResult = this.readString(resultPtr);
      if (encodedResult === null) {
        throw new Error("Native font profile result pointer was null");
      }
      const decoded = JSON.parse(encodedResult);
      if (!decoded || typeof decoded !== "object" || typeof decoded.ok !== "boolean") {
        throw new Error("Native font profile bridge returned an invalid result contract");
      }
      return decoded;
    } finally {
      if (resultPtr !== 0) {
        nativeFree(resultPtr);
      }
      if (requestPtr !== 0) {
        this.module._free(requestPtr);
      }
    }
  }
  /**
   * Convert a filesystem path to a file:// URL
   * Required by LibreOffice's getAbsoluteURL() which uses rtl::Uri::convertRelToAbs()
   */
  toFileUrl(path2) {
    if (path2.startsWith("file://")) return path2;
    const absolutePath = path2.startsWith("/") ? path2 : "/" + path2;
    return "file://" + absolutePath;
  }
  /**
   * Load a document from the virtual filesystem
   */
  documentLoad(path2) {
    if (this.lokPtr === 0) {
      throw new Error("LOK not initialized");
    }
    const fileUrl = this.toFileUrl(path2);
    this.log("Loading document:", path2, "->", fileUrl);
    const pathPtr = this.allocString(fileUrl);
    try {
      const startTime = Date.now();
      let docPtr;
      if (this.useShims && this.module._lok_documentLoad) {
        docPtr = this.module._lok_documentLoad(this.lokPtr, pathPtr);
      } else {
        const lokClassPtr = this.readPtr(this.lokPtr);
        const documentLoadPtr = this.readPtr(lokClassPtr + LOK_CLASS.documentLoad);
        const documentLoad = this.getFunc(documentLoadPtr);
        docPtr = documentLoad(this.lokPtr, pathPtr);
      }
      this.log("Document loaded in", Date.now() - startTime, "ms, ptr:", docPtr);
      if (docPtr === 0) {
        const error = this.getError();
        throw new Error(`Failed to load document: ${error || "unknown error"}`);
      }
      return docPtr;
    } finally {
      this.module._free(pathPtr);
    }
  }
  /**
   * Load a document with options
   */
  documentLoadWithOptions(path2, options) {
    if (this.lokPtr === 0) {
      throw new Error("LOK not initialized");
    }
    const fileUrl = this.toFileUrl(path2);
    this.log("Loading document with options:", path2, "->", fileUrl, options);
    const pathPtr = this.allocString(fileUrl);
    const optsPtr = this.allocString(options);
    try {
      let docPtr;
      if (this.useShims && this.module._lok_documentLoadWithOptions) {
        docPtr = this.module._lok_documentLoadWithOptions(this.lokPtr, pathPtr, optsPtr);
      } else {
        const lokClassPtr = this.readPtr(this.lokPtr);
        const loadWithOptsPtr = this.readPtr(lokClassPtr + LOK_CLASS.documentLoadWithOptions);
        if (loadWithOptsPtr === 0) {
          return this.documentLoad(path2);
        }
        const loadWithOpts = this.getFunc(loadWithOptsPtr);
        docPtr = loadWithOpts(this.lokPtr, pathPtr, optsPtr);
      }
      if (docPtr === 0) {
        const error = this.getError();
        throw new Error(`Failed to load document: ${error || "unknown error"}`);
      }
      this.log("Document loaded, ptr:", docPtr);
      return docPtr;
    } finally {
      this.module._free(pathPtr);
      this.module._free(optsPtr);
    }
  }
  /**
   * Save a document to a different format
   */
  documentSaveAs(docPtr, outputPath, format, filterOptions = "") {
    if (docPtr === 0) {
      throw new Error("Invalid document pointer");
    }
    const fileUrl = this.toFileUrl(outputPath);
    this.log("Saving document to:", outputPath, "->", fileUrl, "format:", format);
    const urlPtr = this.allocString(fileUrl);
    const formatPtr = this.allocString(format);
    const optsPtr = this.allocString(filterOptions);
    try {
      let result;
      if (this.useShims && this.module._lok_documentSaveAs) {
        result = this.module._lok_documentSaveAs(docPtr, urlPtr, formatPtr, optsPtr);
      } else {
        const docClassPtr = this.readPtr(docPtr);
        const saveAsPtr = this.readPtr(docClassPtr + DOC_CLASS.saveAs);
        const saveAs = this.getFunc(saveAsPtr);
        result = saveAs(docPtr, urlPtr, formatPtr, optsPtr);
      }
      this.log("Save result:", result);
      if (result === 0) {
        throw new Error("Failed to save document");
      }
    } finally {
      this.module._free(urlPtr);
      this.module._free(formatPtr);
      this.module._free(optsPtr);
    }
  }
  /**
   * Destroy a document
   */
  documentDestroy(docPtr) {
    if (docPtr === 0) return;
    if (this.useShims && this.module._lok_documentDestroy) {
      this.module._lok_documentDestroy(docPtr);
      this.log("Document destroyed (via shim)");
      return;
    }
    const docClassPtr = this.readPtr(docPtr);
    const destroyPtr = this.readPtr(docClassPtr + DOC_CLASS.destroy);
    if (destroyPtr !== 0) {
      const destroy = this.getFunc(destroyPtr);
      destroy(docPtr);
      this.log("Document destroyed (via vtable)");
    }
  }
  /**
   * Destroy the LOK instance
   */
  destroy() {
    if (this.lokPtr === 0) return;
    try {
      if (this.useShims && this.module._lok_destroy) {
        this.module._lok_destroy(this.lokPtr);
        this.log("LOK destroyed (via shim)");
      } else {
        const lokClassPtr = this.readPtr(this.lokPtr);
        const destroyPtr = this.readPtr(lokClassPtr + LOK_CLASS.destroy);
        if (destroyPtr !== 0) {
          const destroy = this.getFunc(destroyPtr);
          destroy(this.lokPtr);
          this.log("LOK destroyed (via vtable)");
        }
      }
    } catch (error) {
      this.log("LOK destroy error (ignored):", error);
    }
    this.lokPtr = 0;
  }
  /**
   * Check if LOK is initialized
   */
  isInitialized() {
    return this.lokPtr !== 0;
  }
  /**
   * Check if using direct shim exports
   */
  isUsingShims() {
    return this.useShims;
  }
  // ==========================================
  // Page Rendering Methods
  // ==========================================
  /**
   * Get the number of parts (pages/slides) in a document
   */
  documentGetParts(docPtr) {
    if (docPtr === 0) {
      throw new Error("Invalid document pointer");
    }
    if (this.useShims && this.module._lok_documentGetParts) {
      return this.module._lok_documentGetParts(docPtr);
    }
    this.log("documentGetParts: shim not available");
    return 0;
  }
  /**
   * Get the current part (page/slide) index
   */
  documentGetPart(docPtr) {
    if (docPtr === 0) {
      throw new Error("Invalid document pointer");
    }
    if (this.useShims && this.module._lok_documentGetPart) {
      return this.module._lok_documentGetPart(docPtr);
    }
    this.log("documentGetPart: shim not available");
    return 0;
  }
  /**
   * Set the current part (page/slide) index
   */
  documentSetPart(docPtr, part) {
    if (docPtr === 0) {
      throw new Error("Invalid document pointer");
    }
    if (this.useShims && this.module._lok_documentSetPart) {
      this.module._lok_documentSetPart(docPtr, part);
      return;
    }
    this.log("documentSetPart: shim not available");
  }
  /**
   * Get document type (0=text, 1=spreadsheet, 2=presentation, 3=drawing)
   */
  documentGetDocumentType(docPtr) {
    if (docPtr === 0) {
      throw new Error("Invalid document pointer");
    }
    if (this.useShims && this.module._lok_documentGetDocumentType) {
      return this.module._lok_documentGetDocumentType(docPtr);
    }
    this.log("documentGetDocumentType: shim not available");
    return 0;
  }
  /**
   * Get document size in twips (1/1440 inch)
   */
  documentGetDocumentSize(docPtr) {
    this.log(`documentGetDocumentSize called with docPtr: ${docPtr}`);
    if (docPtr === 0) {
      throw new Error("Invalid document pointer");
    }
    if (this.useShims && this.module._lok_documentGetDocumentSize) {
      const sizePtr = this.module._malloc(8);
      try {
        this.module._lok_documentGetDocumentSize(docPtr, sizePtr, sizePtr + 4);
        const width = this.HEAP32[sizePtr >> 2] ?? 0;
        const height = this.HEAP32[sizePtr + 4 >> 2] ?? 0;
        this.log(`documentGetDocumentSize: ${width}x${height} twips`);
        return { width, height };
      } finally {
        this.module._free(sizePtr);
      }
    }
    this.log("documentGetDocumentSize: shim not available");
    return { width: 0, height: 0 };
  }
  /**
   * Initialize document for rendering
   */
  documentInitializeForRendering(docPtr, options = "") {
    if (docPtr === 0) {
      throw new Error("Invalid document pointer");
    }
    if (this.useShims && this.module._lok_documentInitializeForRendering) {
      const optsPtr = this.allocString(options);
      try {
        this.module._lok_documentInitializeForRendering(docPtr, optsPtr);
      } finally {
        this.module._free(optsPtr);
      }
      return;
    }
    this.log("documentInitializeForRendering: shim not available");
  }
  /**
   * Paint a tile of the document to a buffer
   * @param docPtr Document pointer
   * @param canvasWidth Output width in pixels
   * @param canvasHeight Output height in pixels
   * @param tilePosX X position in twips
   * @param tilePosY Y position in twips
   * @param tileWidth Width in twips
   * @param tileHeight Height in twips
   * @returns RGBA pixel data
   */
  documentPaintTile(docPtr, canvasWidth, canvasHeight, tilePosX, tilePosY, tileWidth, tileHeight) {
    if (docPtr === 0) {
      throw new Error("Invalid document pointer");
    }
    if (this.useShims && this.module._lok_documentPaintTile) {
      const bufferSize = canvasWidth * canvasHeight * 4;
      const bufferPtr = this.module._malloc(bufferSize);
      if (bufferPtr === 0) {
        throw new Error(`Failed to allocate ${bufferSize} bytes for tile buffer`);
      }
      try {
        this.module._lok_documentPaintTile(
          docPtr,
          bufferPtr,
          canvasWidth,
          canvasHeight,
          tilePosX,
          tilePosY,
          tileWidth,
          tileHeight
        );
        const result = new Uint8Array(bufferSize);
        result.set(this.HEAPU8.subarray(bufferPtr, bufferPtr + bufferSize));
        return result;
      } finally {
        this.module._free(bufferPtr);
      }
    }
    this.log("documentPaintTile: shim not available");
    return new Uint8Array(0);
  }
  /**
   * Get tile mode (0=RGBA, 1=BGRA)
   */
  documentGetTileMode(docPtr) {
    if (docPtr === 0) {
      throw new Error("Invalid document pointer");
    }
    if (this.useShims && this.module._lok_documentGetTileMode) {
      return this.module._lok_documentGetTileMode(docPtr);
    }
    this.log("documentGetTileMode: shim not available");
    return 0;
  }
  /**
   * Render a page/slide to an image
   * @param docPtr Document pointer
   * @param pageIndex Page/slide index (0-based)
   * @param width Output width in pixels
   * @param height Output height in pixels (0 = auto based on aspect ratio)
   * @returns RGBA pixel data and dimensions
   */
  renderPage(docPtr, pageIndex, width, height = 0, editMode = false) {
    this.documentInitializeForRendering(docPtr);
    const docType = this.documentGetDocumentType(docPtr);
    if (docType === 2 || docType === 3) {
      console.log(`[LOK] Setting part to ${pageIndex} for presentation/drawing`);
      this.documentSetPart(docPtr, pageIndex);
      const currentPart = this.documentGetPart(docPtr);
      console.log(`[LOK] Current part after setPart: ${currentPart}`);
      if (!editMode) {
        this.setEditMode(docPtr, 0);
        console.log(`[LOK] Set edit mode to 0 (view mode) for presentation rendering`);
      }
    }
    const docSize = this.documentGetDocumentSize(docPtr);
    this.log("Document size (twips):", docSize);
    if (docSize.width === 0 || docSize.height === 0) {
      throw new Error("Failed to get document size");
    }
    let tilePosX = 0;
    let tilePosY = 0;
    let tileWidth = docSize.width;
    let tileHeight = docSize.height;
    if (docType === 0 || docType === 1) {
      const pageRectsStr = this.getPartPageRectangles(docPtr);
      if (pageRectsStr) {
        const pageRects = this.parsePageRectangles(pageRectsStr);
        const pageRect = pageRects[pageIndex];
        if (pageRect) {
          tilePosX = pageRect.x;
          tilePosY = pageRect.y;
          tileWidth = pageRect.width;
          tileHeight = pageRect.height;
          this.log(`Page ${pageIndex} rectangle:`, pageRect);
        }
      }
    }
    const aspectRatio = tileHeight / tileWidth;
    const outputWidth = width;
    const outputHeight = height > 0 ? height : Math.round(width * aspectRatio);
    console.log(`[LOK] Calling paintTile: ${outputWidth}x${outputHeight} from tile pos (${tilePosX}, ${tilePosY}) size (${tileWidth}x${tileHeight})`);
    const data = this.documentPaintTile(
      docPtr,
      outputWidth,
      outputHeight,
      tilePosX,
      tilePosY,
      tileWidth,
      tileHeight
    );
    console.log(`[LOK] paintTile returned ${data.length} bytes`);
    return { data, width: outputWidth, height: outputHeight };
  }
  /**
   * Render a page/slide at full quality (native resolution based on DPI)
   *
   * Unlike renderPage which scales to a fixed width, this method renders
   * at the document's native resolution converted to pixels at the specified DPI.
   *
   * @param docPtr Document pointer
   * @param pageIndex Page/slide index (0-based)
   * @param dpi Dots per inch for rendering (default 150, use 300 for print quality)
   * @param maxDimension Optional maximum dimension (width or height) to prevent memory issues
   * @returns RGBA pixel data and dimensions
   *
   * @example
   * // Render at 150 DPI (good for screen)
   * const preview = lokBindings.renderPageFullQuality(docPtr, 0, 150);
   *
   * // Render at 300 DPI (print quality)
   * const highRes = lokBindings.renderPageFullQuality(docPtr, 0, 300);
   *
   * // Render with max dimension cap to prevent memory issues
   * const capped = lokBindings.renderPageFullQuality(docPtr, 0, 300, 4096);
   */
  renderPageFullQuality(docPtr, pageIndex, dpi = 150, maxDimension, editMode = false) {
    this.documentInitializeForRendering(docPtr);
    const docType = this.documentGetDocumentType(docPtr);
    if (docType === 2 || docType === 3) {
      this.log(`Setting part to ${pageIndex} for presentation/drawing`);
      this.documentSetPart(docPtr, pageIndex);
      if (!editMode) {
        this.setEditMode(docPtr, 0);
        this.log(`Set edit mode to 0 (view mode) for presentation rendering`);
      }
    }
    const docSize = this.documentGetDocumentSize(docPtr);
    this.log("Document size (twips):", docSize);
    if (docSize.width === 0 || docSize.height === 0) {
      throw new Error("Failed to get document size");
    }
    let tilePosX = 0;
    let tilePosY = 0;
    let tileWidth = docSize.width;
    let tileHeight = docSize.height;
    if (docType === 0 || docType === 1) {
      const pageRectsStr = this.getPartPageRectangles(docPtr);
      if (pageRectsStr) {
        const pageRects = this.parsePageRectangles(pageRectsStr);
        const pageRect = pageRects[pageIndex];
        if (pageRect) {
          tilePosX = pageRect.x;
          tilePosY = pageRect.y;
          tileWidth = pageRect.width;
          tileHeight = pageRect.height;
          this.log(`Page ${pageIndex} rectangle:`, pageRect);
        }
      }
    }
    const TWIPS_PER_INCH = 1440;
    let outputWidth = Math.round(tileWidth * dpi / TWIPS_PER_INCH);
    let outputHeight = Math.round(tileHeight * dpi / TWIPS_PER_INCH);
    let effectiveDpi = dpi;
    if (maxDimension && (outputWidth > maxDimension || outputHeight > maxDimension)) {
      const scale = maxDimension / Math.max(outputWidth, outputHeight);
      outputWidth = Math.round(outputWidth * scale);
      outputHeight = Math.round(outputHeight * scale);
      effectiveDpi = Math.round(dpi * scale);
      this.log(`Capped dimensions to ${outputWidth}x${outputHeight} (effective DPI: ${effectiveDpi})`);
    }
    console.log(`[LOK] renderPageFullQuality: ${outputWidth}x${outputHeight} at ${effectiveDpi} DPI from tile (${tilePosX}, ${tilePosY}) size (${tileWidth}x${tileHeight}) twips`);
    const data = this.documentPaintTile(
      docPtr,
      outputWidth,
      outputHeight,
      tilePosX,
      tilePosY,
      tileWidth,
      tileHeight
    );
    console.log(`[LOK] renderPageFullQuality returned ${data.length} bytes`);
    return { data, width: outputWidth, height: outputHeight, dpi: effectiveDpi };
  }
  // ==========================================
  // Text Selection and Content Methods
  // ==========================================
  /**
   * Get currently selected text
   * @param docPtr Document pointer
   * @param mimeType Desired MIME type. Must include charset, e.g., 'text/plain;charset=utf-8'
   *                 Note: 'text/plain' without charset is NOT supported by LOK
   * @returns Selected text or null
   */
  getTextSelection(docPtr, mimeType = "text/plain;charset=utf-8") {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetTextSelection) {
      const mimePtr = this.allocString(mimeType);
      const usedMimePtr = this.module._malloc(4);
      try {
        const resultPtr = this.module._lok_documentGetTextSelection(docPtr, mimePtr, usedMimePtr);
        if (resultPtr === 0) return null;
        const result = this.readString(resultPtr);
        this.module._free(resultPtr);
        return result;
      } finally {
        this.module._free(mimePtr);
        this.module._free(usedMimePtr);
      }
    }
    this.log("getTextSelection: shim not available");
    return null;
  }
  /**
   * Set text selection at coordinates
   * @param docPtr Document pointer
   * @param type Selection type (LOK_SETTEXTSELECTION_START, END, or RESET)
   * @param x X coordinate in twips
   * @param y Y coordinate in twips
   */
  setTextSelection(docPtr, type, x, y) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentSetTextSelection) {
      this.module._lok_documentSetTextSelection(docPtr, type, x, y);
      return;
    }
    this.log("setTextSelection: shim not available");
  }
  /**
   * Get current selection type
   * @param docPtr Document pointer
   * @returns Selection type (LOK_SELTYPE_NONE, TEXT, or CELL)
   */
  getSelectionType(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetSelectionType) {
      return this.module._lok_documentGetSelectionType(docPtr);
    }
    this.log("getSelectionType: shim not available");
    return 0;
  }
  /**
   * Reset/clear current selection
   * @param docPtr Document pointer
   */
  resetSelection(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentResetSelection) {
      this.module._lok_documentResetSelection(docPtr);
      return;
    }
    this.log("resetSelection: shim not available");
  }
  // ==========================================
  // Mouse and Keyboard Event Methods
  // ==========================================
  /**
   * Post a mouse event to the document
   * @param docPtr Document pointer
   * @param type Event type (LOK_MOUSEEVENT_BUTTONDOWN, BUTTONUP, MOVE)
   * @param x X coordinate in twips
   * @param y Y coordinate in twips
   * @param count Click count (1 for single, 2 for double click)
   * @param buttons Button mask (1=left, 2=middle, 4=right)
   * @param modifier Modifier keys mask
   */
  postMouseEvent(docPtr, type, x, y, count = 1, buttons = 1, modifier = 0) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentPostMouseEvent) {
      this.module._lok_documentPostMouseEvent(docPtr, type, x, y, count, buttons, modifier);
      return;
    }
    this.log("postMouseEvent: shim not available");
  }
  /**
   * Post a keyboard event to the document
   * @param docPtr Document pointer
   * @param type Event type (LOK_KEYEVENT_KEYINPUT, KEYUP)
   * @param charCode Character code
   * @param keyCode Key code
   */
  postKeyEvent(docPtr, type, charCode, keyCode) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentPostKeyEvent) {
      this.module._lok_documentPostKeyEvent(docPtr, type, charCode, keyCode);
      return;
    }
    this.log("postKeyEvent: shim not available");
  }
  // ==========================================
  // UNO Command Methods
  // ==========================================
  /**
   * Execute a UNO command
   * @param docPtr Document pointer
   * @param command UNO command (e.g., '.uno:SelectAll', '.uno:Copy')
   * @param args JSON arguments string
   * @param notifyWhenFinished Whether to notify when command completes
   */
  postUnoCommand(docPtr, command, args = "{}", notifyWhenFinished = false) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentPostUnoCommand) {
      const cmdPtr = this.allocString(command);
      const argsPtr = this.allocString(args);
      try {
        this.module._lok_documentPostUnoCommand(docPtr, cmdPtr, argsPtr, notifyWhenFinished ? 1 : 0);
      } finally {
        this.module._free(cmdPtr);
        this.module._free(argsPtr);
      }
      return;
    }
    this.log("postUnoCommand: shim not available");
  }
  /**
   * Get command values (query document state)
   * @param docPtr Document pointer
   * @param command Command to query (e.g., '.uno:CharFontName')
   * @returns JSON string with command values
   */
  getCommandValues(docPtr, command) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetCommandValues) {
      const cmdPtr = this.allocString(command);
      try {
        const resultPtr = this.module._lok_documentGetCommandValues(docPtr, cmdPtr);
        if (resultPtr === 0) return null;
        const result = this.readString(resultPtr);
        this.module._free(resultPtr);
        return result;
      } finally {
        this.module._free(cmdPtr);
      }
    }
    this.log("getCommandValues: shim not available");
    return null;
  }
  // ==========================================
  // Page/Part Information Methods
  // ==========================================
  /**
   * Get bounding rectangles for all pages
   * @param docPtr Document pointer
   * @returns String with rectangles "x,y,width,height;x,y,width,height;..."
   */
  getPartPageRectangles(docPtr) {
    this.log(`getPartPageRectangles called with docPtr: ${docPtr}`);
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetPartPageRectangles) {
      this.log("getPartPageRectangles: using shim");
      const resultPtr = this.module._lok_documentGetPartPageRectangles(docPtr);
      this.log(`getPartPageRectangles: resultPtr=${resultPtr}`);
      if (resultPtr === 0) return null;
      const result = this.readString(resultPtr);
      this.log(`getPartPageRectangles: result="${result?.slice(0, 100)}..."`);
      this.module._free(resultPtr);
      return result;
    }
    this.log("getPartPageRectangles: shim not available");
    return null;
  }
  /**
   * Get information about a page/slide
   * @param docPtr Document pointer
   * @param part Part index
   * @returns JSON string with part info
   */
  getPartInfo(docPtr, part) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetPartInfo) {
      const resultPtr = this.module._lok_documentGetPartInfo(docPtr, part);
      if (resultPtr === 0) return null;
      const result = this.readString(resultPtr);
      this.module._free(resultPtr);
      return result;
    }
    this.log("getPartInfo: shim not available");
    return null;
  }
  /**
   * Get name of a page/slide
   * @param docPtr Document pointer
   * @param part Part index
   * @returns Part name
   */
  getPartName(docPtr, part) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetPartName) {
      const resultPtr = this.module._lok_documentGetPartName(docPtr, part);
      if (resultPtr === 0) return null;
      const result = this.readString(resultPtr);
      this.module._free(resultPtr);
      return result;
    }
    this.log("getPartName: shim not available");
    return null;
  }
  // ==========================================
  // Clipboard Methods
  // ==========================================
  /**
   * Paste content at current cursor position
   * @param docPtr Document pointer
   * @param mimeType MIME type of data
   * @param data Data to paste
   * @returns true if successful
   */
  paste(docPtr, mimeType, data) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentPaste) {
      const mimePtr = this.allocString(mimeType);
      let dataPtr;
      let dataSize;
      if (typeof data === "string") {
        const bytes = new TextEncoder().encode(data);
        dataSize = bytes.length;
        dataPtr = this.module._malloc(dataSize);
        this.HEAPU8.set(bytes, dataPtr);
      } else {
        dataSize = data.length;
        dataPtr = this.module._malloc(dataSize);
        this.HEAPU8.set(data, dataPtr);
      }
      try {
        return this.module._lok_documentPaste(docPtr, mimePtr, dataPtr, dataSize) !== 0;
      } finally {
        this.module._free(mimePtr);
        this.module._free(dataPtr);
      }
    }
    this.log("paste: shim not available");
    return false;
  }
  // ==========================================
  // View and Zoom Methods
  // ==========================================
  /**
   * Set client zoom level
   * @param docPtr Document pointer
   * @param tilePixelWidth Tile width in pixels
   * @param tilePixelHeight Tile height in pixels
   * @param tileTwipWidth Tile width in twips
   * @param tileTwipHeight Tile height in twips
   */
  setClientZoom(docPtr, tilePixelWidth, tilePixelHeight, tileTwipWidth, tileTwipHeight) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentSetClientZoom) {
      this.module._lok_documentSetClientZoom(docPtr, tilePixelWidth, tilePixelHeight, tileTwipWidth, tileTwipHeight);
      return;
    }
    this.log("setClientZoom: shim not available");
  }
  /**
   * Set visible area for the client
   * @param docPtr Document pointer
   * @param x X position in twips
   * @param y Y position in twips
   * @param width Width in twips
   * @param height Height in twips
   */
  setClientVisibleArea(docPtr, x, y, width, height) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentSetClientVisibleArea) {
      this.module._lok_documentSetClientVisibleArea(docPtr, x, y, width, height);
      return;
    }
    this.log("setClientVisibleArea: shim not available");
  }
  // ==========================================
  // Accessibility Methods
  // ==========================================
  /**
   * Get the currently focused paragraph text
   * @param docPtr Document pointer
   * @returns Focused paragraph text
   */
  getA11yFocusedParagraph(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetA11yFocusedParagraph) {
      const resultPtr = this.module._lok_documentGetA11yFocusedParagraph(docPtr);
      if (resultPtr === 0) return null;
      const result = this.readString(resultPtr);
      this.module._free(resultPtr);
      return result;
    }
    this.log("getA11yFocusedParagraph: shim not available");
    return null;
  }
  /**
   * Get caret position in focused paragraph
   * @param docPtr Document pointer
   * @returns Caret position or -1
   */
  getA11yCaretPosition(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetA11yCaretPosition) {
      return this.module._lok_documentGetA11yCaretPosition(docPtr);
    }
    this.log("getA11yCaretPosition: shim not available");
    return -1;
  }
  /**
   * Enable/disable accessibility features
   * @param docPtr Document pointer
   * @param viewId View ID
   * @param enabled Whether to enable accessibility
   */
  setAccessibilityState(docPtr, viewId, enabled) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentSetAccessibilityState) {
      this.module._lok_documentSetAccessibilityState(docPtr, viewId, enabled ? 1 : 0);
      return;
    }
    this.log("setAccessibilityState: shim not available");
  }
  // ==========================================
  // Spreadsheet-Specific Methods
  // ==========================================
  /**
   * Get data area for a spreadsheet (last used row/column)
   * @param docPtr Document pointer
   * @param part Sheet index
   * @returns Object with col and row counts
   */
  getDataArea(docPtr, part) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetDataArea) {
      const colPtr = this.module._malloc(8);
      const rowPtr = this.module._malloc(8);
      try {
        this.module._lok_documentGetDataArea(docPtr, part, colPtr, rowPtr);
        const col = this.HEAP32[colPtr >> 2] ?? 0;
        const row = this.HEAP32[rowPtr >> 2] ?? 0;
        return { col, row };
      } finally {
        this.module._free(colPtr);
        this.module._free(rowPtr);
      }
    }
    this.log("getDataArea: shim not available");
    return { col: 0, row: 0 };
  }
  // ==========================================
  // Edit Mode Methods
  // ==========================================
  /**
   * Get current edit mode
   * @param docPtr Document pointer
   * @returns Edit mode value
   */
  getEditMode(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetEditMode) {
      return this.module._lok_documentGetEditMode(docPtr);
    }
    this.log("getEditMode: shim not available");
    return 0;
  }
  /**
   * Set edit mode for the document
   * @param docPtr Document pointer
   * @param mode 0 for view mode, 1 for edit mode
   */
  setEditMode(docPtr, mode) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentSetEditMode) {
      this.log(`setEditMode: setting mode to ${mode}`);
      this.module._lok_documentSetEditMode(docPtr, mode);
      return;
    }
    this.log("setEditMode: shim not available");
  }
  // ==========================================
  // View Management Methods
  // ==========================================
  /**
   * Create a new view for the document
   * @param docPtr Document pointer
   * @returns View ID
   */
  createView(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentCreateView) {
      const viewId = this.module._lok_documentCreateView(docPtr);
      this.log(`createView: created view ${viewId}`);
      return viewId;
    }
    this.log("createView: shim not available");
    return -1;
  }
  /**
   * Create a new view with options
   * @param docPtr Document pointer
   * @param options Options string (JSON)
   * @returns View ID
   */
  createViewWithOptions(docPtr, options) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentCreateViewWithOptions) {
      const optionsPtr = this.allocString(options);
      try {
        const viewId = this.module._lok_documentCreateViewWithOptions(docPtr, optionsPtr);
        this.log(`createViewWithOptions: created view ${viewId}`);
        return viewId;
      } finally {
        this.module._free(optionsPtr);
      }
    }
    this.log("createViewWithOptions: shim not available");
    return -1;
  }
  /**
   * Destroy a view
   * @param docPtr Document pointer
   * @param viewId View ID to destroy
   */
  destroyView(docPtr, viewId) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentDestroyView) {
      this.log(`destroyView: destroying view ${viewId}`);
      this.module._lok_documentDestroyView(docPtr, viewId);
      return;
    }
    this.log("destroyView: shim not available");
  }
  /**
   * Set the current active view
   * @param docPtr Document pointer
   * @param viewId View ID to make active
   */
  setView(docPtr, viewId) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentSetView) {
      this.log(`setView: setting active view to ${viewId}`);
      this.module._lok_documentSetView(docPtr, viewId);
      return;
    }
    this.log("setView: shim not available");
  }
  /**
   * Get the current active view ID
   * @param docPtr Document pointer
   * @returns Current view ID
   */
  getView(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetView) {
      return this.module._lok_documentGetView(docPtr);
    }
    this.log("getView: shim not available");
    return -1;
  }
  /**
   * Get the number of views
   * @param docPtr Document pointer
   * @returns Number of views
   */
  getViewsCount(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentGetViewsCount) {
      return this.module._lok_documentGetViewsCount(docPtr);
    }
    this.log("getViewsCount: shim not available");
    return 0;
  }
  // ==========================================
  // Event Loop and Callback Methods
  // ==========================================
  /**
   * Enable synchronous event dispatch (Unipoll mode).
   * This must be called before using postKeyEvent, postMouseEvent, etc.
   * to ensure events are processed immediately instead of being queued.
   *
   * Without this, events posted via postKeyEvent/postMouseEvent are queued
   * via Application::PostUserEvent() and never processed in headless mode.
   */
  enableSyncEvents() {
    if (this.useShims && this.module._lok_enableSyncEvents) {
      this.module._lok_enableSyncEvents();
      this.log("enableSyncEvents: Unipoll mode enabled");
    } else {
      this.log("enableSyncEvents: shim not available");
    }
  }
  /**
   * Disable synchronous event dispatch.
   * Call this when done with event-based operations.
   */
  disableSyncEvents() {
    if (this.useShims && this.module._lok_disableSyncEvents) {
      this.module._lok_disableSyncEvents();
      this.log("disableSyncEvents: Unipoll mode disabled");
    } else {
      this.log("disableSyncEvents: shim not available");
    }
  }
  // ==========================================
  // Callback Queue Methods
  // ==========================================
  /**
   * Register a callback handler for the document.
   * Events are queued and can be retrieved via pollCallback().
   * @param docPtr Document pointer
   */
  registerCallback(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentRegisterCallback) {
      this.module._lok_documentRegisterCallback(docPtr);
      this.log("registerCallback: callback registered");
    } else {
      this.log("registerCallback: shim not available");
    }
  }
  /**
   * Unregister the callback handler for the document.
   * @param docPtr Document pointer
   */
  unregisterCallback(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    if (this.useShims && this.module._lok_documentUnregisterCallback) {
      this.module._lok_documentUnregisterCallback(docPtr);
      this.log("unregisterCallback: callback unregistered");
    } else {
      this.log("unregisterCallback: shim not available");
    }
  }
  /**
   * Check if there are any pending callback events.
   * @returns true if events are pending
   */
  hasCallbackEvents() {
    if (this.useShims && this.module._lok_hasCallbackEvents) {
      return this.module._lok_hasCallbackEvents() !== 0;
    }
    return false;
  }
  /**
   * Get the number of pending callback events.
   * @returns Number of events in the queue
   */
  getCallbackEventCount() {
    if (this.useShims && this.module._lok_getCallbackEventCount) {
      return this.module._lok_getCallbackEventCount();
    }
    return 0;
  }
  /**
   * Poll and retrieve the next callback event from the queue.
   * @returns The next event, or null if queue is empty
   */
  pollCallback() {
    if (!this.useShims || !this.module._lok_pollCallback) {
      return null;
    }
    const bufferSize = 4096;
    const payloadBuffer = this.module._malloc(bufferSize);
    const payloadLengthPtr = this.module._malloc(4);
    try {
      const eventType = this.module._lok_pollCallback(payloadBuffer, bufferSize, payloadLengthPtr);
      if (eventType === -1) {
        return null;
      }
      const payloadLength = this.module.HEAP32[payloadLengthPtr >> 2] ?? 0;
      let payload = "";
      if (payloadLength > 0) {
        const len = Math.min(payloadLength, bufferSize - 1);
        const bytes = this.module.HEAPU8.slice(payloadBuffer, payloadBuffer + len);
        payload = textDecoder.decode(bytes);
      }
      return {
        type: eventType,
        typeName: getCallbackTypeName(eventType),
        payload
      };
    } finally {
      this.module._free(payloadBuffer);
      this.module._free(payloadLengthPtr);
    }
  }
  /**
   * Poll all pending callback events.
   * @returns Array of all pending events
   */
  pollAllCallbacks() {
    const events = [];
    let event = this.pollCallback();
    while (event !== null) {
      events.push(event);
      event = this.pollCallback();
    }
    return events;
  }
  /**
   * Clear all pending callback events.
   */
  clearCallbackQueue() {
    if (this.useShims && this.module._lok_clearCallbackQueue) {
      this.module._lok_clearCallbackQueue();
      this.log("clearCallbackQueue: queue cleared");
    }
  }
  /**
   * Force flush pending LOK callbacks for a document.
   * This is needed in WASM because callbacks are queued via PostUserEvent
   * but the event loop doesn't run automatically.
   * Call this after operations that trigger callbacks (e.g., postUnoCommand)
   * to ensure the callback queue is populated.
   * @param docPtr Document pointer
   */
  flushCallbacks(docPtr) {
    if (docPtr === 0) throw new Error("Invalid document pointer");
    const hasShim = !!this.module._lok_flushCallbacks;
    this.log(`flushCallbacks: useShims=${this.useShims}, _lok_flushCallbacks exists=${hasShim}`);
    if (this.useShims && this.module._lok_flushCallbacks) {
      this.module._lok_flushCallbacks(docPtr);
      this.log("flushCallbacks: callbacks flushed");
    } else {
      this.log("flushCallbacks: shim not available");
    }
  }
  /**
   * Poll for STATE_CHANGED callbacks and parse them into a map.
   * STATE_CHANGED payloads are in format: ".uno:CommandName=value"
   * @returns Map of command names to values
   */
  pollStateChanges() {
    const states = /* @__PURE__ */ new Map();
    const events = this.pollAllCallbacks();
    for (const event of events) {
      if (event.type === LOK_CALLBACK_STATE_CHANGED) {
        const eqIndex = event.payload.indexOf("=");
        if (eqIndex !== -1) {
          const key = event.payload.substring(0, eqIndex);
          const value = event.payload.substring(eqIndex + 1);
          states.set(key, value);
        } else {
          states.set(event.payload, "");
        }
      }
    }
    return states;
  }
  // ==========================================
  // High-Level Convenience Methods
  // ==========================================
  /**
   * Click at a position and get text at that location
   * @param docPtr Document pointer
   * @param x X coordinate in twips
   * @param y Y coordinate in twips
   * @returns Text at the clicked position
   */
  clickAndGetText(docPtr, x, y) {
    this.postMouseEvent(docPtr, LOK_MOUSEEVENT_BUTTONDOWN, x, y, 1, 1, 0);
    this.postMouseEvent(docPtr, LOK_MOUSEEVENT_BUTTONUP, x, y, 1, 1, 0);
    return this.getTextSelection(docPtr, "text/plain;charset=utf-8");
  }
  /**
   * Double-click to select a word and get it
   * @param docPtr Document pointer
   * @param x X coordinate in twips
   * @param y Y coordinate in twips
   * @returns Selected word
   */
  doubleClickAndGetWord(docPtr, x, y) {
    this.postMouseEvent(docPtr, LOK_MOUSEEVENT_BUTTONDOWN, x, y, 2, 1, 0);
    this.postMouseEvent(docPtr, LOK_MOUSEEVENT_BUTTONUP, x, y, 2, 1, 0);
    return this.getTextSelection(docPtr, "text/plain;charset=utf-8");
  }
  /**
   * Select all content in the document
   * @param docPtr Document pointer
   */
  selectAll(docPtr) {
    this.postUnoCommand(docPtr, ".uno:SelectAll");
  }
  /**
   * Get all text content from the document
   * @param docPtr Document pointer
   * @returns All text content
   */
  getAllText(docPtr) {
    this.log(`getAllText called with docPtr: ${docPtr}`);
    this.selectAll(docPtr);
    const text = this.getTextSelection(docPtr, "text/plain;charset=utf-8");
    this.log(`getAllText: text="${text?.slice(0, 100)}..."`);
    this.resetSelection(docPtr);
    return text;
  }
  /**
   * Parse page rectangles string into array of objects
   * @param rectanglesStr String from getPartPageRectangles
   * @returns Array of rectangle objects
   */
  parsePageRectangles(rectanglesStr) {
    if (!rectanglesStr) return [];
    return rectanglesStr.split(";").filter((s) => s.trim()).map((rect) => {
      const parts = rect.split(",").map(Number);
      return {
        x: parts[0] ?? 0,
        y: parts[1] ?? 0,
        width: parts[2] ?? 0,
        height: parts[3] ?? 0
      };
    });
  }
};

// src/emscripten-startup-policy.ts
var EMSCRIPTEN_STARTUP_POLICY = Object.freeze({ noInitialRun: true });
function withEmscriptenStartupPolicy(config) {
  return {
    ...config,
    ...EMSCRIPTEN_STARTUP_POLICY
  };
}

// src/conversion-output.ts
var ConversionCleanupUncertaintyError = class extends ConversionError {
  issues;
  constructor(issues) {
    super(
      "CONVERSION_FAILED" /* CONVERSION_FAILED */,
      `Conversion cleanup uncertainty: ${issues.join("; ")}`
    );
    this.name = "ConversionCleanupUncertaintyError";
    this.issues = [...issues];
  }
};
function splitPath(path2) {
  const separator = path2.lastIndexOf("/");
  if (separator === -1) return { directory: ".", filename: path2 };
  return {
    directory: path2.slice(0, separator) || "/",
    filename: path2.slice(separator + 1)
  };
}
function joinPath(directory, filename) {
  return directory === "/" ? `/${filename}` : `${directory}/${filename}`;
}
function cleanupFailure(action, error) {
  return new ConversionCleanupUncertaintyError([`${action}: ${String(error)}`]);
}
function beginCsvConversionTransaction(fs2, inputPath, outputPath, outputFormat) {
  if (outputFormat !== "csv") return null;
  const input = splitPath(inputPath);
  const output = splitPath(outputPath);
  let entries;
  try {
    entries = fs2.readdir(output.directory);
  } catch (error) {
    throw cleanupFailure(
      `could not enumerate ${output.directory} before CSV conversion`,
      error
    );
  }
  const existingOutputEntries = new Set(entries);
  if (existingOutputEntries.has(output.filename)) {
    try {
      fs2.unlink(outputPath);
    } catch (error) {
      throw cleanupFailure(`could not remove stale exact output ${outputPath}`, error);
    }
    let afterRemoval;
    try {
      afterRemoval = fs2.readdir(output.directory);
    } catch (error) {
      throw cleanupFailure(
        `could not prove stale exact output ${outputPath} was removed`,
        error
      );
    }
    if (afterRemoval.includes(output.filename)) {
      throw new ConversionCleanupUncertaintyError([
        `stale exact output ${outputPath} survived pre-transaction removal`
      ]);
    }
  }
  const stem = output.filename.endsWith(".csv") ? output.filename.slice(0, -".csv".length) : output.filename;
  return {
    fs: fs2,
    input,
    output,
    siblingPrefix: `${stem}-`,
    existingOutputEntries
  };
}
function listDirectory(fs2, directory, phase, issues) {
  try {
    return fs2.readdir(directory);
  } catch (error) {
    issues.push(`could not enumerate ${directory} ${phase}: ${String(error)}`);
    return null;
  }
}
function unlinkTrackedPath(fs2, path2, label, issues) {
  try {
    fs2.unlink(path2);
  } catch (error) {
    issues.push(`could not remove ${label} ${path2}: ${String(error)}`);
  }
}
function finishCsvConversionTransaction(transaction) {
  const { fs: fs2, input, output } = transaction;
  const issues = [];
  const inputBefore = listDirectory(fs2, input.directory, "during cleanup", issues);
  const outputBefore = listDirectory(fs2, output.directory, "during cleanup", issues);
  if (inputBefore?.includes(input.filename)) {
    unlinkTrackedPath(
      fs2,
      joinPath(input.directory, input.filename),
      "transaction input",
      issues
    );
  }
  if (outputBefore?.includes(output.filename)) {
    unlinkTrackedPath(
      fs2,
      joinPath(output.directory, output.filename),
      "exact output",
      issues
    );
  }
  for (const entry of outputBefore ?? []) {
    if (transaction.existingOutputEntries.has(entry) || !entry.startsWith(transaction.siblingPrefix) || !entry.endsWith(".csv")) {
      continue;
    }
    unlinkTrackedPath(
      fs2,
      joinPath(output.directory, entry),
      "unexpected CSV sibling",
      issues
    );
  }
  const inputAfter = listDirectory(fs2, input.directory, "after cleanup", issues);
  const outputAfter = listDirectory(fs2, output.directory, "after cleanup", issues);
  if (inputAfter?.includes(input.filename)) {
    issues.push(`transaction input ${joinPath(input.directory, input.filename)} survived cleanup`);
  }
  if (outputAfter?.includes(output.filename)) {
    issues.push(`exact output ${joinPath(output.directory, output.filename)} survived cleanup`);
  }
  for (const entry of outputAfter ?? []) {
    if (!transaction.existingOutputEntries.has(entry) && entry.startsWith(transaction.siblingPrefix) && entry.endsWith(".csv")) {
      issues.push(`unexpected CSV sibling ${joinPath(output.directory, entry)} survived cleanup`);
    }
  }
  if (issues.length > 0) {
    throw new ConversionCleanupUncertaintyError(issues);
  }
}
function attachCleanupUncertainty(primaryError, cleanupError) {
  if (!(primaryError instanceof Error)) {
    Object.defineProperty(cleanupError, "primaryFailure", {
      value: primaryError,
      enumerable: false
    });
    return cleanupError;
  }
  Object.defineProperty(primaryError, "cleanupUncertainty", {
    value: cleanupError,
    enumerable: false,
    configurable: true
  });
  if (primaryError instanceof ConversionError) {
    const details = [primaryError.details, cleanupError.message].filter((value) => Boolean(value)).join("; ");
    Object.defineProperty(primaryError, "details", {
      value: details,
      enumerable: true,
      configurable: true
    });
  }
  return primaryError;
}
function readExactConvertedOutput(fs2, outputPath) {
  let output;
  try {
    output = fs2.readFile(outputPath);
  } catch (error) {
    throw new ConversionError(
      "CONVERSION_FAILED" /* CONVERSION_FAILED */,
      `Conversion output contract violation: exact output ${outputPath} is missing`,
      String(error)
    );
  }
  if (!(output instanceof Uint8Array) || output.length === 0) {
    throw new ConversionError(
      "CONVERSION_FAILED" /* CONVERSION_FAILED */,
      `Conversion output contract violation: exact output ${outputPath} is empty`
    );
  }
  return output;
}

// src/converter-node.ts
var LibreOfficeConverter = class {
  module = null;
  lokBindings = null;
  initialized = false;
  initializing = false;
  options;
  corrupted = false;
  fsTracked = false;
  constructor(options = {}) {
    this.options = {
      wasmPath: "./wasm",
      verbose: false,
      ...options
    };
  }
  /**
   * Check if an error indicates LOK corruption requiring reinitialization
   */
  isCorruptionError(error) {
    const msg = error instanceof Error ? error.message : error;
    return msg.includes("memory access out of bounds") || msg.includes("ComponentContext is not avail") || msg.includes("unreachable") || msg.includes("table index is out of bounds") || msg.includes("null function");
  }
  quarantineRuntime() {
    this.initialized = false;
    this.corrupted = true;
    this.lokBindings = null;
    this.module = null;
    if (this.options.verbose) {
      console.log("[LibreOfficeConverter] Native conversion runtime quarantined");
    }
  }
  mapNativeConversionError(error) {
    const code = error.result?.stage === "load" ? "LOAD_FAILED" /* LOAD_FAILED */ : error.kind === "contract" ? "UNSUPPORTED_FORMAT" /* UNSUPPORTED_FORMAT */ : "CONVERSION_FAILED" /* CONVERSION_FAILED */;
    const details = error.result ? `stage=${error.result.stage}, cleanup=${error.result.cleanup}` : void 0;
    return new ConversionError(code, error.message, details);
  }
  /**
   * Force reinitialization of the converter (for recovery from errors)
   */
  async reinitialize() {
    if (this.options.verbose) {
      console.log("[LibreOfficeConverter] Reinitializing due to corruption...");
    }
    if (this.lokBindings) {
      try {
        this.lokBindings.destroy();
      } catch {
      }
      this.lokBindings = null;
    }
    this.module = null;
    this.initialized = false;
    this.corrupted = false;
    await this.initialize();
  }
  /**
   * Initialize with a pre-loaded Emscripten module
   * This is useful for environments like Web Workers that have their own
   * WASM loading mechanism (e.g., importScripts with progress tracking)
   */
  async initializeWithModule(module) {
    if (this.initialized) {
      return;
    }
    if (this.initializing) {
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!this.initialized) {
        throw new ConversionError(
          "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
          "Converter initialization failed"
        );
      }
      return;
    }
    this.initializing = true;
    try {
      this.module = module;
      this.setupFileSystem();
      await this.injectFonts();
      this.initializeLibreOfficeKit();
      this.initialized = true;
      this.options.onReady?.();
    } catch (error) {
      console.error("[LibreOfficeConverter] Initialization error:", error);
      const convError = error instanceof ConversionError ? error : new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        `Failed to initialize with module: ${String(error)}`
      );
      this.options.onError?.(convError);
      throw convError;
    } finally {
      this.initializing = false;
    }
  }
  /**
   * Initialize the LibreOffice WASM module
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    if (this.initializing) {
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!this.initialized) {
        throw new ConversionError(
          "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
          "Converter initialization failed"
        );
      }
      return;
    }
    this.initializing = true;
    this.emitProgress("loading", 0, "Loading LibreOffice WASM module...");
    try {
      this.module = await this.loadModule();
      this.emitProgress("initializing", 50, "Setting up virtual filesystem...");
      this.setupFileSystem();
      await this.injectFonts();
      this.emitProgress("initializing", 60, "Initializing LibreOfficeKit...");
      this.initializeLibreOfficeKit();
      this.emitProgress("initializing", 90, "LibreOfficeKit ready");
      this.initialized = true;
      this.emitProgress("complete", 100, "LibreOffice ready");
      this.options.onReady?.();
    } catch (error) {
      console.error("[LibreOfficeConverter] Initialization error:", error);
      const convError = error instanceof ConversionError ? error : new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        `Failed to initialize WASM module: ${String(error)}`
      );
      this.options.onError?.(convError);
      throw convError;
    } finally {
      this.initializing = false;
    }
  }
  /**
   * Load the Emscripten WASM module (Node.js only)
   * Requires wasmLoader option to be provided for bundler compatibility
   */
  async loadModule() {
    if (this.options.verbose) {
      console.log("[LibreOfficeConverter] Loading WASM module...", this.options.wasmPath, this.options.workerPath, this.options.wasmLoader);
    }
    if (!this.options.wasmLoader) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        'wasmLoader option is required. Import the loader and pass it:\n  import wasmLoader from "@killbus/libreoffice-converter/wasm/loader.cjs";\n  new LibreOfficeConverter({ wasmLoader })'
      );
    }
    const config = withEmscriptenStartupPolicy({
      verbose: this.options.verbose,
      print: this.options.verbose ? console.log : () => {
      },
      printErr: this.options.verbose ? console.error : () => {
      },
      onProgress: (_phase, percent, message) => {
        this.emitProgress("loading", percent, message);
      }
    });
    return await this.options.wasmLoader.createModule(config);
  }
  /**
   * Set up the virtual filesystem
   */
  setupFileSystem() {
    if (!this.module?.FS) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Filesystem not available"
      );
    }
    const emFs = this.module.FS;
    const tryMkdir = (dirPath) => {
      try {
        emFs.mkdir(dirPath);
      } catch {
      }
    };
    tryMkdir("/tmp");
    tryMkdir("/tmp/input");
    tryMkdir("/tmp/output");
  }
  /**
   * Inject user-supplied and system fonts into the WASM virtual filesystem.
   * Must be called after module load (FS available) and before LOK init (fontconfig scan).
   */
  async injectFonts() {
    if (!this.module?.FS) return;
    let fonts = this.options.fonts ? [...this.options.fonts] : [];
    if (this.options.includeSystemFonts) {
      const { loadSystemFonts: loadSystemFonts2 } = await Promise.resolve().then(() => (init_font_loader(), font_loader_exports));
      const systemFonts = await loadSystemFonts2();
      if (this.options.verbose) {
        console.log(`[Fonts] Found ${systemFonts.length} system font(s)`);
      }
      fonts = [...systemFonts, ...fonts];
    }
    if (fonts.length === 0) return;
    const emFs = this.module.FS;
    const fontDir = "/instdir/share/fonts/truetype";
    for (const font of fonts) {
      const destPath = `${fontDir}/${font.filename}`;
      const data = font.data instanceof ArrayBuffer ? new Uint8Array(font.data) : font.data;
      emFs.writeFile(destPath, data);
      if (this.options.verbose) {
        console.log(`[Fonts] Injected ${font.filename} (${data.byteLength} bytes)`);
      }
    }
    if (this.options.verbose) {
      console.log(`[Fonts] Injected ${fonts.length} font(s) total`);
    }
  }
  /**
   * Initialize LibreOfficeKit
   */
  initializeLibreOfficeKit() {
    if (!this.module) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Module not loaded"
      );
    }
    if (this.options.verbose && this.module.FS) {
      const emFs2 = this.module.FS;
      if (!this.fsTracked) {
        this.fsTracked = true;
        if (!emFs2.trackingDelegate) {
          emFs2.trackingDelegate = {
            onOpen: (filePath) => {
              console.log("[FS OPEN]", filePath);
            },
            onOpenFile: (filePath) => {
              console.log("[FS OPEN FILE]", filePath);
            }
          };
        }
        if (typeof emFs2.open === "function") {
          const originalOpen = emFs2.open.bind(emFs2);
          emFs2.open = ((filePath, flags, mode) => {
            console.log("[FS OPEN CALL]", filePath);
            try {
              return originalOpen(filePath, flags, mode);
            } catch (err) {
              const error = err;
              if (error?.code === "ENOENT") {
                console.log("[FS ENOENT]", filePath);
              }
              throw err;
            }
          });
        }
      }
      const logDir = (label, dirPath) => {
        try {
          console.log(`[FS] ${label}:`, emFs2.readdir(dirPath));
        } catch (e) {
          console.log(`[FS] ${label}: ERROR -`, e.message);
        }
      };
      logDir("ROOT", "/");
      logDir("PROGRAM DIR", "/instdir/program");
      logDir("SHARE DIR", "/instdir/share");
      logDir("REGISTRY DIR", "/instdir/share/registry");
      logDir("FILTER DIR", "/instdir/share/filter");
      logDir("CONFIG DIR", "/instdir/share/config/soffice.cfg");
      logDir("CONFIG FILTER", "/instdir/share/config/soffice.cfg/filter");
      logDir("IMPRESS MODULES", "/instdir/share/config/soffice.cfg/modules/simpress");
    }
    const emFs = this.module.FS;
    const createDir = (dirPath) => {
      try {
        emFs.mkdir(dirPath);
        if (this.options.verbose) {
          console.log("[FS] Created directory:", dirPath);
        }
      } catch (e) {
        const err = e;
        if (err.code !== "EEXIST") {
          if (this.options.verbose) {
            console.log("[FS] mkdir failed:", dirPath, e.message);
          }
        }
      }
    };
    createDir("/instdir/user");
    createDir("/instdir/user/temp");
    createDir("/instdir/user/temp/embeddedfonts");
    createDir("/instdir/user/temp/embeddedfonts/fromdocs");
    createDir("/instdir/user/temp/embeddedfonts/fromsystem");
    createDir("/instdir/user/registry");
    createDir("/instdir/user/registry/data");
    this.lokBindings = new LOKBindings(this.module, this.options.verbose);
    try {
      this.lokBindings.initialize("/instdir/program");
      if (this.options.verbose) {
        const versionInfo = this.lokBindings.getVersionInfo();
        if (versionInfo) {
          console.log("[LOK] Version:", versionInfo);
        }
      }
    } catch (error) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        `Failed to initialize LibreOfficeKit: ${String(error)}`
      );
    }
  }
  /**
   * Convert a document to a different format
   */
  async convert(input, options, filename = "document") {
    const effectiveFilterOptions = resolveSingleResultFilterOptions(
      options.outputFormat,
      options.filterOptions
    );
    if (this.corrupted) {
      await this.reinitialize();
    }
    if (!this.initialized || !this.module) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "LibreOffice WASM not initialized. Call initialize() first."
      );
    }
    const startTime = Date.now();
    const inputData = this.normalizeInput(input);
    if (inputData.length === 0) {
      throw new ConversionError(
        "INVALID_INPUT" /* INVALID_INPUT */,
        "Empty document provided"
      );
    }
    const inputExt = options.inputFormat || this.getExtensionFromFilename(filename) || "docx";
    const outputExt = options.outputFormat;
    if (!FORMAT_FILTERS[outputExt]) {
      throw new ConversionError(
        "UNSUPPORTED_FORMAT" /* UNSUPPORTED_FORMAT */,
        `Unsupported output format: ${outputExt}`
      );
    }
    if (!isConversionValid(inputExt, outputExt)) {
      throw new ConversionError(
        "UNSUPPORTED_FORMAT" /* UNSUPPORTED_FORMAT */,
        getConversionErrorMessage(inputExt, outputExt)
      );
    }
    const inputPath = `/tmp/input/doc.${inputExt}`;
    const outputPath = `/tmp/output/doc.${outputExt}`;
    let csvTransaction;
    try {
      csvTransaction = beginCsvConversionTransaction(
        this.module.FS,
        inputPath,
        outputPath,
        outputExt
      );
    } catch (error) {
      this.quarantineRuntime();
      throw error;
    }
    const effectiveOptions = effectiveFilterOptions === options.filterOptions ? options : { ...options, filterOptions: effectiveFilterOptions };
    let primaryError;
    let conversionFailed = false;
    try {
      this.emitProgress("converting", 10, "Writing input document...");
      this.module.FS.writeFile(inputPath, inputData);
      this.emitProgress("converting", 30, "Converting document...");
      const result = await this.performConversion(
        inputPath,
        outputPath,
        inputExt,
        effectiveOptions
      );
      this.emitProgress("complete", 100, "Conversion complete");
      const baseName = this.getBasename(filename);
      const outputFilename = `${baseName}.${outputExt}`;
      return {
        data: result,
        mimeType: FORMAT_MIME_TYPES[outputExt],
        filename: outputFilename,
        duration: Date.now() - startTime
      };
    } catch (error) {
      conversionFailed = true;
      primaryError = error;
      if (error instanceof Error && this.isCorruptionError(error)) {
        this.corrupted = true;
        if (this.options.verbose) {
          console.log("[LibreOfficeConverter] Corruption detected, will reinitialize on next convert");
        }
      }
      throw error;
    } finally {
      if (csvTransaction) {
        try {
          finishCsvConversionTransaction(csvTransaction);
        } catch (error) {
          const cleanupError = error instanceof ConversionCleanupUncertaintyError ? error : new ConversionCleanupUncertaintyError([String(error)]);
          this.quarantineRuntime();
          if (conversionFailed) {
            const annotatedError = attachCleanupUncertainty(primaryError, cleanupError);
            if (!(primaryError instanceof Error)) throw annotatedError;
          } else {
            throw cleanupError;
          }
        }
      } else {
        try {
          this.module?.FS.unlink(inputPath);
        } catch {
        }
        try {
          this.module?.FS.unlink(outputPath);
        } catch {
        }
      }
    }
  }
  /**
   * Perform a basic conversion through the official hidden native bridge.
   * Pointer-based image export remains on the legacy path below.
   */
  async performConversion(inputPath, outputPath, inputFormat, options) {
    if (options.outputFormat === "png" || options.outputFormat === "svg") {
      return this.performLegacyImageConversion(
        inputPath,
        outputPath,
        inputFormat,
        options
      );
    }
    if (!this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Module not loaded"
      );
    }
    const module = this.module;
    const lokBindings = this.lokBindings;
    this.emitProgress("converting", 40, "Running hidden native conversion...");
    try {
      const request = createNativeConversionRequest({
        inputPath,
        outputPath,
        inputFormat,
        outputFormat: options.outputFormat,
        password: options.password,
        filterOptions: options.filterOptions,
        pdf: options.pdf
      });
      const nativeResult = await runNativeConversionWhenReady(
        () => lokBindings.convertDocument(request)
      );
      assertNativeConversionSucceeded(nativeResult);
    } catch (error) {
      if (error instanceof NativeConversionError) {
        if (!error.runtimeReusable) {
          this.quarantineRuntime();
        }
        throw this.mapNativeConversionError(error);
      }
      if (error instanceof ConversionError) {
        throw error;
      }
      throw new ConversionError(
        "CONVERSION_FAILED" /* CONVERSION_FAILED */,
        `Conversion failed: ${String(error)}`
      );
    }
    this.emitProgress("converting", 90, "Reading output...");
    return readExactConvertedOutput(module.FS, outputPath);
  }
  /**
   * Preserve the raw document-pointer transaction for image export only.
   */
  async performLegacyImageConversion(inputPath, outputPath, inputFormat, options) {
    if (!this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Module not loaded"
      );
    }
    this.emitProgress("converting", 40, "Loading document...");
    let docPtr = 0;
    try {
      const loadOptions = buildLoadOptions(inputFormat, options.password);
      if (this.options.verbose) {
        try {
          const stat = this.module.FS.stat(inputPath);
          console.log("[Convert] File exists before LOK load:", inputPath, "size:", stat.size);
        } catch (e) {
          console.log("[Convert] File NOT found before LOK load:", inputPath, e.message);
        }
        if (loadOptions) {
          console.log("[Convert] Using load options:", loadOptions);
        }
      }
      if (loadOptions) {
        docPtr = this.lokBindings.documentLoadWithOptions(inputPath, loadOptions);
      } else {
        docPtr = this.lokBindings.documentLoad(inputPath);
      }
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document"
        );
      }
      this.emitProgress("converting", 60, "Converting format...");
      const lokFormat = OUTPUT_FORMAT_TO_LOK[options.outputFormat];
      let filterOptions = options.filterOptions ?? FORMAT_FILTER_OPTIONS[options.outputFormat] ?? "";
      if (!options.filterOptions && options.outputFormat === "pdf" && options.pdf) {
        filterOptions = buildPdfFilterOptions(options.pdf) || filterOptions;
      }
      if (options.image?.pageIndex !== void 0) {
        const pageNum = options.image.pageIndex + 1;
        if (filterOptions) {
          filterOptions += `;PageRange=${pageNum}-${pageNum}`;
        } else {
          filterOptions = `PageRange=${pageNum}-${pageNum}`;
        }
      }
      this.emitProgress("converting", 70, "Saving document...");
      this.lokBindings.documentSaveAs(docPtr, outputPath, lokFormat, filterOptions);
      this.emitProgress("converting", 90, "Reading output...");
      try {
        const outputData = this.module.FS.readFile(outputPath);
        if (outputData.length === 0) {
          throw new ConversionError(
            "CONVERSION_FAILED" /* CONVERSION_FAILED */,
            "Conversion produced empty output"
          );
        }
        return outputData;
      } catch (fsError) {
        throw new ConversionError(
          "CONVERSION_FAILED" /* CONVERSION_FAILED */,
          `Failed to read converted file: ${String(fsError)}`
        );
      }
    } catch (error) {
      if (error instanceof ConversionError) {
        throw error;
      }
      throw new ConversionError(
        "CONVERSION_FAILED" /* CONVERSION_FAILED */,
        `Conversion failed: ${String(error)}`
      );
    } finally {
      if (docPtr !== 0 && this.lokBindings) {
        try {
          this.lokBindings.documentDestroy(docPtr);
        } catch {
        }
      }
    }
  }
  /**
   * Render page previews (thumbnails) for a document
   */
  async renderPagePreviews(input, options, renderOptions = {}) {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = (options.inputFormat || "docx").toLowerCase();
    const width = renderOptions.width ?? 256;
    const height = renderOptions.height ?? 0;
    const pageIndices = renderOptions.pageIndices ?? [];
    const inputPath = `/tmp/preview/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/preview");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document for preview"
        );
      }
      try {
        const numParts = this.lokBindings.documentGetParts(docPtr);
        if (this.options.verbose) {
          console.log(`[Preview] Document has ${numParts} pages/parts`);
        }
        const pagesToRender = pageIndices.length > 0 ? pageIndices.filter((i) => i >= 0 && i < numParts) : Array.from({ length: numParts }, (_, i) => i);
        const results = [];
        const editMode = renderOptions.editMode ?? false;
        for (const pageIndex of pagesToRender) {
          if (this.options.verbose) {
            console.log(`[Preview] Rendering page ${pageIndex + 1}/${numParts}`);
          }
          const preview = this.lokBindings.renderPage(docPtr, pageIndex, width, height, editMode);
          results.push({
            page: pageIndex,
            data: preview.data,
            width: preview.width,
            height: preview.height
          });
        }
        return results;
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/preview");
      } catch {
      }
    }
  }
  /**
   * Render a page at full quality (native resolution based on DPI)
   */
  async renderPageFullQuality(input, options, pageIndex, renderOptions = {}) {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = (options.inputFormat || "docx").toLowerCase();
    const dpi = renderOptions.dpi ?? 150;
    const maxDimension = renderOptions.maxDimension;
    const inputPath = `/tmp/fullquality/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/fullquality");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document for full quality render"
        );
      }
      try {
        const numParts = this.lokBindings.documentGetParts(docPtr);
        if (pageIndex < 0 || pageIndex >= numParts) {
          throw new ConversionError(
            "CONVERSION_FAILED" /* CONVERSION_FAILED */,
            `Page index ${pageIndex} out of range (0-${numParts - 1})`
          );
        }
        if (this.options.verbose) {
          console.log(`[FullQuality] Rendering page ${pageIndex + 1}/${numParts} at ${dpi} DPI`);
        }
        const editMode = renderOptions.editMode ?? false;
        const preview = this.lokBindings.renderPageFullQuality(docPtr, pageIndex, dpi, maxDimension, editMode);
        return {
          page: pageIndex,
          data: preview.data,
          width: preview.width,
          height: preview.height,
          dpi: preview.dpi
        };
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/fullquality");
      } catch {
      }
    }
  }
  /**
   * Get the number of pages/parts in a document
   */
  async getPageCount(input, options) {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = (options.inputFormat || "docx").toLowerCase();
    const inputPath = `/tmp/pagecount/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/pagecount");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document"
        );
      }
      try {
        return this.lokBindings.documentGetParts(docPtr);
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/pagecount");
      } catch {
      }
    }
  }
  /**
   * Get valid output formats for a document by loading it and checking its type
   */
  async getDocumentInfo(input, options) {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = (options.inputFormat || "docx").toLowerCase();
    const inputPath = `/tmp/docinfo/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/docinfo");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document"
        );
      }
      try {
        const docType = this.lokBindings.documentGetDocumentType(docPtr);
        const pageCount = this.lokBindings.documentGetParts(docPtr);
        const validOutputFormats = getOutputFormatsForDocType(docType);
        const docTypeNames = {
          [0 /* TEXT */]: "Text Document",
          [1 /* SPREADSHEET */]: "Spreadsheet",
          [2 /* PRESENTATION */]: "Presentation",
          [3 /* DRAWING */]: "Drawing",
          [4 /* OTHER */]: "Other"
        };
        return {
          documentType: docType,
          documentTypeName: docTypeNames[docType] || "Unknown",
          validOutputFormats,
          pageCount
        };
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/docinfo");
      } catch {
      }
    }
  }
  // ============================================
  // Document Inspection Methods
  // ============================================
  async getDocumentText(input, options) {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = options.inputFormat?.toLowerCase();
    if (!inputFormat) {
      throw new ConversionError(
        "INVALID_INPUT" /* INVALID_INPUT */,
        "Input format is required"
      );
    }
    const inputPath = `/tmp/inspect/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/inspect");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document"
        );
      }
      try {
        return this.lokBindings.getAllText(docPtr);
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/inspect");
      } catch {
      }
    }
  }
  async getPageNames(input, options) {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = options.inputFormat?.toLowerCase();
    if (!inputFormat) {
      throw new ConversionError(
        "INVALID_INPUT" /* INVALID_INPUT */,
        "Input format is required"
      );
    }
    const inputPath = `/tmp/names/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/names");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document"
        );
      }
      try {
        const numParts = this.lokBindings.documentGetParts(docPtr);
        const names = [];
        for (let i = 0; i < numParts; i++) {
          const name = this.lokBindings.getPartName(docPtr, i);
          names.push(name || `Page ${i + 1}`);
        }
        return names;
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/names");
      } catch {
      }
    }
  }
  async getPageRectangles(input, options) {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = options.inputFormat?.toLowerCase();
    if (!inputFormat) {
      throw new ConversionError(
        "INVALID_INPUT" /* INVALID_INPUT */,
        "Input format is required"
      );
    }
    const inputPath = `/tmp/rects/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/rects");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document"
        );
      }
      try {
        const rectsStr = this.lokBindings.getPartPageRectangles(docPtr);
        return this.lokBindings.parsePageRectangles(rectsStr || "");
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/rects");
      } catch {
      }
    }
  }
  async getSpreadsheetDataArea(input, options, sheetIndex = 0) {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = options.inputFormat?.toLowerCase();
    if (!inputFormat) {
      throw new ConversionError(
        "INVALID_INPUT" /* INVALID_INPUT */,
        "Input format is required"
      );
    }
    const inputPath = `/tmp/dataarea/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/dataarea");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document"
        );
      }
      try {
        return this.lokBindings.getDataArea(docPtr, sheetIndex);
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/dataarea");
      } catch {
      }
    }
  }
  async executeUnoCommand(input, options, command, args = "{}") {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = options.inputFormat?.toLowerCase();
    if (!inputFormat) {
      throw new ConversionError(
        "INVALID_INPUT" /* INVALID_INPUT */,
        "Input format is required"
      );
    }
    const inputPath = `/tmp/uno/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/uno");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document"
        );
      }
      try {
        this.lokBindings.postUnoCommand(docPtr, command, args);
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/uno");
      } catch {
      }
    }
  }
  // ============================================
  // ILibreOfficeConverter Interface Methods
  // ============================================
  async renderPage(input, options, pageIndex, width, height = 0) {
    if (!this.initialized || !this.module || !this.lokBindings) {
      throw new ConversionError(
        "WASM_NOT_INITIALIZED" /* WASM_NOT_INITIALIZED */,
        "Converter not initialized"
      );
    }
    const data = this.normalizeInput(input);
    const inputFormat = (options.inputFormat || "docx").toLowerCase();
    const inputPath = `/tmp/renderpage/doc.${inputFormat}`;
    const emFs = this.module.FS;
    try {
      try {
        emFs.mkdir("/tmp/renderpage");
      } catch {
      }
      emFs.writeFile(inputPath, data);
      const docPtr = this.lokBindings.documentLoad(inputPath);
      if (docPtr === 0) {
        throw new ConversionError(
          "LOAD_FAILED" /* LOAD_FAILED */,
          "Failed to load document"
        );
      }
      try {
        const preview = this.lokBindings.renderPage(docPtr, pageIndex, width, height);
        return {
          page: pageIndex,
          data: preview.data,
          width: preview.width,
          height: preview.height
        };
      } finally {
        this.lokBindings.documentDestroy(docPtr);
      }
    } finally {
      try {
        emFs.unlink(inputPath);
      } catch {
      }
      try {
        emFs.rmdir("/tmp/renderpage");
      } catch {
      }
    }
  }
  openDocument(_input, _options) {
    return Promise.reject(new ConversionError(
      "CONVERSION_FAILED" /* CONVERSION_FAILED */,
      "Editor sessions not supported by LibreOfficeConverter. Use WorkerConverter or WorkerBrowserConverter."
    ));
  }
  editorOperation(_sessionId, _method, _args) {
    return Promise.reject(new ConversionError(
      "CONVERSION_FAILED" /* CONVERSION_FAILED */,
      "Editor operations not supported by LibreOfficeConverter. Use WorkerConverter or WorkerBrowserConverter."
    ));
  }
  closeDocument(_sessionId) {
    return Promise.reject(new ConversionError(
      "CONVERSION_FAILED" /* CONVERSION_FAILED */,
      "Editor sessions not supported by LibreOfficeConverter. Use WorkerConverter or WorkerBrowserConverter."
    ));
  }
  getLokBindings() {
    return this.lokBindings;
  }
  destroy() {
    if (this.lokBindings) {
      try {
        this.lokBindings.destroy();
      } catch {
      }
      this.lokBindings = null;
    }
    if (typeof process !== "undefined") {
      try {
        const proc = process;
        if (proc._getActiveHandles) {
          const handles = proc._getActiveHandles();
          for (const handle of handles) {
            if (handle?.unref) {
              const name = handle.constructor?.name ?? "";
              if (name === "MessagePort" || name === "Socket" && !handle.remoteAddress) {
                handle.unref();
              }
            }
          }
        }
      } catch {
      }
    }
    this.module = null;
    this.initialized = false;
    return Promise.resolve();
  }
  isReady() {
    return this.initialized;
  }
  getModule() {
    return this.module;
  }
  static getSupportedInputFormats() {
    return Object.keys(EXTENSION_TO_FORMAT);
  }
  static getSupportedOutputFormats() {
    return Object.keys(FORMAT_FILTERS);
  }
  static getValidOutputFormats(inputFormat) {
    return getValidOutputFormats(inputFormat);
  }
  static isConversionSupported(inputFormat, outputFormat) {
    return isConversionValid(inputFormat, outputFormat);
  }
  // ============================================
  // Private helper methods
  // ============================================
  normalizeInput(input) {
    if (input instanceof Uint8Array) {
      return input;
    }
    if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    }
    return new Uint8Array(input);
  }
  getExtensionFromFilename(filename) {
    const parts = filename.split(".");
    if (parts.length > 1) {
      return parts.pop()?.toLowerCase() || null;
    }
    return null;
  }
  getBasename(filename) {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot > 0) {
      return filename.substring(0, lastDot);
    }
    return filename;
  }
  emitProgress(phase, percent, message) {
    this.options.onProgress?.({ phase, percent, message });
  }
};

// src/editor/base.ts
var OfficeEditor = class {
  lok;
  docPtr;
  options;
  inputPath = "";
  constructor(lok, docPtr, options = {}) {
    this.lok = lok;
    this.docPtr = docPtr;
    this.options = {
      maxResponseChars: options.maxResponseChars ?? 8e3,
      ...options
    };
  }
  // ============================================
  // Accessor methods
  // ============================================
  /**
   * Get the document pointer for low-level LOK operations
   */
  getDocPtr() {
    return this.docPtr;
  }
  /**
   * Get the LOK bindings for low-level operations
   */
  getLokBindings() {
    return this.lok;
  }
  // ============================================
  // Lifecycle methods
  // ============================================
  save() {
    try {
      if (!this.inputPath) {
        return this.createErrorResult("No input path set", "Use saveAs() to specify a path");
      }
      this.lok.postUnoCommand(this.docPtr, ".uno:Save");
      return this.createResult({ path: this.inputPath });
    } catch (error) {
      return this.createErrorResult(`Save failed: ${String(error)}`);
    }
  }
  saveAs(path2, format) {
    try {
      this.lok.documentSaveAs(this.docPtr, path2, format, "");
      return this.createResult({ path: path2 });
    } catch (error) {
      return this.createErrorResult(`SaveAs failed: ${String(error)}`);
    }
  }
  close() {
    try {
      this.lok.documentDestroy(this.docPtr);
      this.docPtr = 0;
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Close failed: ${String(error)}`);
    }
  }
  /**
   * Get the current edit mode of the document
   * @returns 0 = view mode, 1 = edit mode
   */
  getEditMode() {
    return this.lok.getEditMode(this.docPtr);
  }
  /**
   * Attempt to enable edit mode for the document
   * @returns OperationResult with success and verified fields
   */
  enableEditMode() {
    try {
      const beforeMode = this.lok.getEditMode(this.docPtr);
      if (beforeMode === 1) {
        return this.createResult({ editMode: 1 });
      }
      this.lok.postUnoCommand(this.docPtr, ".uno:Edit");
      const afterMode = this.lok.getEditMode(this.docPtr);
      return {
        success: true,
        verified: afterMode === 1,
        data: { editMode: afterMode }
      };
    } catch (error) {
      return this.createErrorResult(`Failed to enable edit mode: ${String(error)}`);
    }
  }
  // ============================================
  // History methods
  // ============================================
  undo() {
    try {
      this.lok.postUnoCommand(this.docPtr, ".uno:Undo");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Undo failed: ${String(error)}`);
    }
  }
  redo() {
    try {
      this.lok.postUnoCommand(this.docPtr, ".uno:Redo");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Redo failed: ${String(error)}`);
    }
  }
  // ============================================
  // Search methods
  // ============================================
  find(text, options) {
    try {
      const searchArgs = JSON.stringify({
        "SearchItem.SearchString": { type: "string", value: text },
        "SearchItem.Backward": { type: "boolean", value: false },
        "SearchItem.SearchAll": { type: "boolean", value: true },
        "SearchItem.MatchCase": { type: "boolean", value: options?.caseSensitive ?? false },
        "SearchItem.WordOnly": { type: "boolean", value: options?.wholeWord ?? false }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:ExecuteSearch", searchArgs);
      const selection = this.lok.getTextSelection(this.docPtr, "text/plain");
      const hasMatch = selection !== null && selection.length > 0;
      return this.createResult({
        matches: hasMatch ? 1 : 0,
        // LOK doesn't provide count, we report if found
        firstMatch: hasMatch ? { x: 0, y: 0 } : void 0
      });
    } catch (error) {
      return this.createErrorResult(`Find failed: ${String(error)}`);
    }
  }
  findAndReplaceAll(find, replace, options) {
    try {
      const searchArgs = JSON.stringify({
        "SearchItem.SearchString": { type: "string", value: find },
        "SearchItem.ReplaceString": { type: "string", value: replace },
        "SearchItem.Command": { type: "long", value: 3 },
        // Replace All
        "SearchItem.MatchCase": { type: "boolean", value: options?.caseSensitive ?? false },
        "SearchItem.WordOnly": { type: "boolean", value: options?.wholeWord ?? false }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:ExecuteSearch", searchArgs);
      return this.createResult({ replacements: -1 });
    } catch (error) {
      return this.createErrorResult(`Replace failed: ${String(error)}`);
    }
  }
  // ============================================
  // Callback-based state retrieval
  // ============================================
  /**
   * Poll all STATE_CHANGED callback events and return as a map.
   *
   * LOK sends STATE_CHANGED events when formatting state changes (e.g., when
   * the cursor moves over bold text, `.uno:Bold=true` is emitted).
   *
   * Pattern for getting current format state:
   * 1. clearCallbackQueue() - clear any stale events
   * 2. Perform action that triggers state change (e.g., SelectWord)
   * 3. flushCallbacks(docPtr) - force LOK to process callbacks
   * 4. pollStateChanges() - retrieve the events
   *
   * @returns Map of UNO command names to their state values
   *          e.g., Map { '.uno:Bold' => 'true', '.uno:Italic' => 'false' }
   */
  getStateChanges() {
    try {
      const states = this.lok.pollStateChanges();
      return this.createResult(states);
    } catch (error) {
      return this.createErrorResult(`Failed to poll state changes: ${String(error)}`);
    }
  }
  /**
   * Flush pending LOK callbacks and then poll for state changes.
   * Convenience method that combines flushCallbacks + pollStateChanges.
   *
   * @returns Map of UNO command names to their state values
   */
  flushAndPollState() {
    try {
      this.lok.flushCallbacks(this.docPtr);
      const states = this.lok.pollStateChanges();
      return this.createResult(states);
    } catch (error) {
      return this.createErrorResult(`Failed to flush and poll state: ${String(error)}`);
    }
  }
  /**
   * Clear the callback queue, useful before performing operations
   * where you want to capture only new state changes.
   */
  clearCallbackQueue() {
    this.lok.clearCallbackQueue();
  }
  // ============================================
  // Selection methods
  // ============================================
  select(_selection) {
    try {
      const text = this.lok.getTextSelection(this.docPtr, "text/plain");
      return this.createResult({ selected: text || "" });
    } catch (error) {
      return this.createErrorResult(`Select failed: ${String(error)}`);
    }
  }
  getSelection() {
    try {
      const text = this.lok.getTextSelection(this.docPtr, "text/plain");
      return this.createResult({
        text: text || "",
        range: { type: "text", start: { paragraph: 0, character: 0 } }
      });
    } catch (error) {
      return this.createErrorResult(`GetSelection failed: ${String(error)}`);
    }
  }
  clearSelection() {
    try {
      this.lok.resetSelection(this.docPtr);
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`ClearSelection failed: ${String(error)}`);
    }
  }
  // ============================================
  // Protected helper methods
  // ============================================
  createResult(data) {
    return {
      success: true,
      verified: true,
      data
    };
  }
  createErrorResult(error, suggestion) {
    return {
      success: false,
      verified: false,
      error,
      suggestion
    };
  }
  createResultWithTruncation(data, truncation) {
    return {
      success: true,
      verified: true,
      data,
      truncated: truncation
    };
  }
  truncateContent(content, maxChars) {
    const limit = maxChars ?? this.options.maxResponseChars;
    const original = content.length;
    if (original <= limit) {
      return { content, truncated: false, original, returned: original };
    }
    let truncated = content.slice(0, limit);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > limit * 0.8) {
      truncated = truncated.slice(0, lastSpace);
    }
    return {
      content: truncated,
      truncated: true,
      original,
      returned: truncated.length
    };
  }
  truncateArray(items, maxChars, itemToString) {
    const original = items.length;
    let charCount = 0;
    let includedCount = 0;
    for (const item of items) {
      const itemStr = itemToString(item);
      if (charCount + itemStr.length > maxChars) {
        break;
      }
      charCount += itemStr.length;
      includedCount++;
    }
    return {
      items: items.slice(0, includedCount),
      truncated: includedCount < original,
      original,
      returned: includedCount
    };
  }
  // ============================================
  // Cell address helpers
  // ============================================
  a1ToRowCol(a1) {
    const match = a1.match(/^([A-Z]+)(\d+)$/i);
    if (!match) {
      throw new Error(`Invalid A1 notation: ${a1}`);
    }
    const colStr = match[1].toUpperCase();
    const rowStr = match[2];
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col -= 1;
    const row = parseInt(rowStr, 10) - 1;
    return { row, col };
  }
  rowColToA1(row, col) {
    let colStr = "";
    let c = col + 1;
    while (c > 0) {
      const remainder = (c - 1) % 26;
      colStr = String.fromCharCode(65 + remainder) + colStr;
      c = Math.floor((c - 1) / 26);
    }
    return `${colStr}${row + 1}`;
  }
  normalizeCellRef(ref) {
    if (typeof ref === "string") {
      return this.a1ToRowCol(ref);
    }
    return ref;
  }
  // ============================================
  // Internal state
  // ============================================
  setInputPath(path2) {
    this.inputPath = path2;
  }
  isOpen() {
    return this.docPtr !== 0;
  }
};

// src/editor/writer.ts
var WriterEditor = class extends OfficeEditor {
  cachedParagraphs = null;
  getDocumentType() {
    return "writer";
  }
  getStructure(options) {
    try {
      const paragraphs = this.getParagraphsInternal();
      const maxChars = options?.maxResponseChars ?? this.options.maxResponseChars;
      const paragraphInfos = paragraphs.map((text, index) => ({
        index,
        preview: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
        style: "Normal",
        // Would need UNO query to get actual style
        charCount: text.length
      }));
      const truncResult = this.truncateArray(
        paragraphInfos,
        maxChars,
        (p) => JSON.stringify(p)
      );
      const structure = {
        type: "writer",
        paragraphs: truncResult.items,
        pageCount: this.lok.documentGetParts(this.docPtr),
        wordCount: paragraphs.join(" ").split(/\s+/).filter((w) => w.length > 0).length
      };
      if (truncResult.truncated) {
        return this.createResultWithTruncation(structure, {
          original: truncResult.original,
          returned: truncResult.returned,
          message: `Showing ${truncResult.returned} of ${truncResult.original} paragraphs. Use getParagraphs(start, count) to paginate.`
        });
      }
      return this.createResult(structure);
    } catch (error) {
      return this.createErrorResult(`Failed to get structure: ${String(error)}`);
    }
  }
  getParagraph(index) {
    try {
      const paragraphs = this.getParagraphsInternal();
      if (index < 0 || index >= paragraphs.length) {
        return this.createErrorResult(
          `Paragraph index ${index} out of range (0-${paragraphs.length - 1})`,
          `Use getStructure() to see available paragraphs`
        );
      }
      const text = paragraphs[index];
      return this.createResult({
        index,
        text,
        style: "Normal",
        charCount: text.length
      });
    } catch (error) {
      return this.createErrorResult(`Failed to get paragraph: ${String(error)}`);
    }
  }
  getParagraphs(start, count) {
    try {
      const paragraphs = this.getParagraphsInternal();
      if (start < 0 || start >= paragraphs.length) {
        return this.createErrorResult(
          `Start index ${start} out of range`,
          `Valid range: 0-${paragraphs.length - 1}`
        );
      }
      const end = Math.min(start + count, paragraphs.length);
      const result = paragraphs.slice(start, end).map((text, i) => ({
        index: start + i,
        text,
        style: "Normal",
        charCount: text.length
      }));
      return this.createResult(result);
    } catch (error) {
      return this.createErrorResult(`Failed to get paragraphs: ${String(error)}`);
    }
  }
  insertParagraph(text, options) {
    try {
      const paragraphs = this.getParagraphsInternal();
      const insertIndex = options?.afterIndex !== void 0 ? options.afterIndex + 1 : paragraphs.length;
      if (insertIndex > 0 && insertIndex <= paragraphs.length) {
        this.lok.postUnoCommand(this.docPtr, ".uno:GoToEndOfDoc");
      }
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertPara");
      const textArgs = JSON.stringify({
        Text: { type: "string", value: text }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertText", textArgs);
      if (options?.style && options.style !== "Normal") {
        const styleMap = {
          "Heading 1": "Heading 1",
          "Heading 2": "Heading 2",
          "Heading 3": "Heading 3",
          "List": "List"
        };
        const styleName = styleMap[options.style];
        if (styleName) {
          const styleArgs = JSON.stringify({
            Template: { type: "string", value: styleName },
            Family: { type: "short", value: 2 }
            // Paragraph styles
          });
          this.lok.postUnoCommand(this.docPtr, ".uno:StyleApply", styleArgs);
        }
      }
      this.cachedParagraphs = null;
      const newParagraphs = this.getParagraphsInternal();
      const verified = newParagraphs.length > paragraphs.length;
      return {
        success: true,
        verified,
        data: { index: insertIndex }
      };
    } catch (error) {
      return this.createErrorResult(`Failed to insert paragraph: ${String(error)}`);
    }
  }
  replaceParagraph(index, text) {
    try {
      const paragraphs = this.getParagraphsInternal();
      if (index < 0 || index >= paragraphs.length) {
        return this.createErrorResult(
          `Paragraph index ${index} out of range`,
          `Valid range: 0-${paragraphs.length - 1}`
        );
      }
      const oldText = paragraphs[index];
      const findReplaceArgs = JSON.stringify({
        "SearchItem.SearchString": { type: "string", value: oldText },
        "SearchItem.ReplaceString": { type: "string", value: text },
        "SearchItem.Command": { type: "long", value: 2 }
        // Replace
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:ExecuteSearch", findReplaceArgs);
      this.cachedParagraphs = null;
      return this.createResult({ oldText });
    } catch (error) {
      return this.createErrorResult(`Failed to replace paragraph: ${String(error)}`);
    }
  }
  deleteParagraph(index) {
    try {
      const paragraphs = this.getParagraphsInternal();
      if (index < 0 || index >= paragraphs.length) {
        return this.createErrorResult(
          `Paragraph index ${index} out of range`,
          `Valid range: 0-${paragraphs.length - 1}`
        );
      }
      const deletedText = paragraphs[index];
      const result = this.replaceParagraph(index, "");
      if (!result.success) {
        return this.createErrorResult(result.error || "Failed to delete");
      }
      return this.createResult({ deletedText });
    } catch (error) {
      return this.createErrorResult(`Failed to delete paragraph: ${String(error)}`);
    }
  }
  insertText(text, _position) {
    try {
      const textArgs = JSON.stringify({
        Text: { type: "string", value: text }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertText", textArgs);
      this.cachedParagraphs = null;
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to insert text: ${String(error)}`);
    }
  }
  deleteText(_start, _end) {
    try {
      const selection = this.lok.getTextSelection(this.docPtr, "text/plain");
      this.lok.postUnoCommand(this.docPtr, ".uno:Delete");
      this.cachedParagraphs = null;
      return this.createResult({ deleted: selection || "" });
    } catch (error) {
      return this.createErrorResult(`Failed to delete text: ${String(error)}`);
    }
  }
  replaceText(find, replace, options) {
    try {
      const command = options?.all ? 3 : 2;
      const searchArgs = JSON.stringify({
        "SearchItem.SearchString": { type: "string", value: find },
        "SearchItem.ReplaceString": { type: "string", value: replace },
        "SearchItem.Command": { type: "long", value: command }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:ExecuteSearch", searchArgs);
      this.cachedParagraphs = null;
      return this.createResult({ replacements: -1 });
    } catch (error) {
      return this.createErrorResult(`Failed to replace text: ${String(error)}`);
    }
  }
  formatText(_range, format) {
    try {
      if (format.bold !== void 0) {
        this.lok.postUnoCommand(this.docPtr, ".uno:Bold");
      }
      if (format.italic !== void 0) {
        this.lok.postUnoCommand(this.docPtr, ".uno:Italic");
      }
      if (format.underline !== void 0) {
        this.lok.postUnoCommand(this.docPtr, ".uno:Underline");
      }
      if (format.fontSize !== void 0) {
        const args = JSON.stringify({
          FontHeight: { type: "float", value: format.fontSize }
        });
        this.lok.postUnoCommand(this.docPtr, ".uno:FontHeight", args);
      }
      if (format.fontName !== void 0) {
        const args = JSON.stringify({
          CharFontName: { type: "string", value: format.fontName }
        });
        this.lok.postUnoCommand(this.docPtr, ".uno:CharFontName", args);
      }
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to format text: ${String(error)}`);
    }
  }
  /**
   * Get the text formatting at the current selection or cursor position.
   *
   * Uses LOK callback mechanism to retrieve STATE_CHANGED events which contain
   * formatting state like `.uno:Bold=true`, `.uno:Italic=false`, etc.
   *
   * @param _position - Text position (currently unused, uses current selection)
   * @returns TextFormat with bold, italic, underline, fontSize, fontName properties
   */
  getFormat(_position) {
    try {
      this.lok.clearCallbackQueue();
      this.lok.postUnoCommand(this.docPtr, ".uno:CharRightSel");
      this.lok.flushCallbacks(this.docPtr);
      this.lok.postUnoCommand(this.docPtr, ".uno:CharLeft");
      this.lok.flushCallbacks(this.docPtr);
      const states = this.lok.pollStateChanges();
      const format = {};
      const boldState = states.get(".uno:Bold");
      if (boldState !== void 0) {
        format.bold = boldState === "true";
      }
      const italicState = states.get(".uno:Italic");
      if (italicState !== void 0) {
        format.italic = italicState === "true";
      }
      const underlineState = states.get(".uno:Underline");
      if (underlineState !== void 0) {
        format.underline = underlineState === "true";
      }
      const fontSizeState = states.get(".uno:FontHeight");
      if (fontSizeState !== void 0) {
        const size = parseFloat(fontSizeState);
        if (!isNaN(size)) {
          format.fontSize = size;
        }
      }
      const fontNameState = states.get(".uno:CharFontName");
      if (fontNameState !== void 0 && fontNameState.length > 0) {
        format.fontName = fontNameState;
      }
      return this.createResult(format);
    } catch (error) {
      return this.createErrorResult(`Failed to get format: ${String(error)}`);
    }
  }
  /**
   * Get formatting state for the current selection using the callback mechanism.
   * This is the preferred way to get character formatting as it uses LOK's
   * STATE_CHANGED callback events.
   *
   * @returns Map of UNO command names to their state values
   */
  getSelectionFormat() {
    try {
      const existingStates = this.lok.pollStateChanges();
      if (existingStates.size === 0) {
        this.lok.clearCallbackQueue();
        this.lok.postUnoCommand(this.docPtr, ".uno:SelectWord");
        this.lok.flushCallbacks(this.docPtr);
        const states = this.lok.pollStateChanges();
        return this.createResult(states);
      }
      return this.createResult(existingStates);
    } catch (error) {
      return this.createErrorResult(`Failed to get selection format: ${String(error)}`);
    }
  }
  // ============================================
  // Private helpers
  // ============================================
  getParagraphsInternal() {
    if (this.cachedParagraphs) {
      return this.cachedParagraphs;
    }
    const allText = this.lok.getAllText(this.docPtr);
    if (!allText) {
      return [];
    }
    this.cachedParagraphs = allText.split(/\n\n|\r\n\r\n/).map((p) => p.trim()).filter((p) => p.length > 0);
    return this.cachedParagraphs;
  }
};

// src/editor/calc.ts
var CalcEditor = class extends OfficeEditor {
  getDocumentType() {
    return "calc";
  }
  getStructure(_options) {
    try {
      const numSheets = this.lok.documentGetParts(this.docPtr);
      const sheets = [];
      for (let i = 0; i < numSheets; i++) {
        const name = this.lok.getPartName(this.docPtr, i) || `Sheet${i + 1}`;
        const dataArea = this.lok.getDataArea(this.docPtr, i);
        sheets.push({
          index: i,
          name,
          usedRange: dataArea.col > 0 && dataArea.row > 0 ? `A1:${this.rowColToA1(dataArea.row - 1, dataArea.col - 1)}` : "A1",
          rowCount: dataArea.row,
          colCount: dataArea.col
        });
      }
      const structure = {
        type: "calc",
        sheets
      };
      return this.createResult(structure);
    } catch (error) {
      return this.createErrorResult(`Failed to get structure: ${String(error)}`);
    }
  }
  getSheetNames() {
    try {
      const numSheets = this.lok.documentGetParts(this.docPtr);
      const names = [];
      for (let i = 0; i < numSheets; i++) {
        const name = this.lok.getPartName(this.docPtr, i) || `Sheet${i + 1}`;
        names.push(name);
      }
      return this.createResult(names);
    } catch (error) {
      return this.createErrorResult(`Failed to get sheet names: ${String(error)}`);
    }
  }
  // ============================================
  // Cell reading
  // ============================================
  getCell(cell, sheet) {
    try {
      this.selectSheet(sheet);
      const { row, col } = this.normalizeCellRef(cell);
      const address = this.rowColToA1(row, col);
      this.goToCell(address);
      const value = this.getCellValueInternal();
      const formula = this.getCellFormulaInternal();
      return this.createResult({
        address,
        value,
        formula: formula || void 0
      });
    } catch (error) {
      return this.createErrorResult(`Failed to get cell: ${String(error)}`);
    }
  }
  getCells(range, sheet, options) {
    try {
      this.selectSheet(sheet);
      const { startRow, startCol, endRow, endCol } = this.normalizeRangeRef(range);
      const maxChars = options?.maxResponseChars ?? this.options.maxResponseChars;
      const cells = [];
      let charCount = 0;
      let truncated = false;
      for (let r = startRow; r <= endRow && !truncated; r++) {
        const rowData = [];
        for (let c = startCol; c <= endCol && !truncated; c++) {
          const address = this.rowColToA1(r, c);
          this.goToCell(address);
          const value = this.getCellValueInternal();
          const cellData = { address, value };
          const cellStr = JSON.stringify(cellData);
          if (charCount + cellStr.length > maxChars) {
            truncated = true;
            break;
          }
          charCount += cellStr.length;
          rowData.push(cellData);
        }
        if (rowData.length > 0) {
          cells.push(rowData);
        }
      }
      if (truncated) {
        return this.createResultWithTruncation(cells, {
          original: (endRow - startRow + 1) * (endCol - startCol + 1),
          returned: cells.reduce((sum, row) => sum + row.length, 0),
          message: "Range truncated due to size. Use smaller ranges to paginate."
        });
      }
      return this.createResult(cells);
    } catch (error) {
      return this.createErrorResult(`Failed to get cells: ${String(error)}`);
    }
  }
  // ============================================
  // Cell writing
  // ============================================
  setCellValue(cell, value, sheet) {
    try {
      this.selectSheet(sheet);
      const { row, col } = this.normalizeCellRef(cell);
      const address = this.rowColToA1(row, col);
      this.goToCell(address);
      const oldValue = this.getCellValueInternal();
      const valueStr = typeof value === "number" ? value.toString() : value;
      const args = JSON.stringify({
        StringName: { type: "string", value: valueStr }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:EnterString", args);
      const newValue = this.getCellValueInternal();
      const expectedStr = typeof value === "number" ? value.toString() : value;
      const verified = newValue === expectedStr || newValue === value;
      return {
        success: true,
        verified,
        data: { oldValue, newValue }
      };
    } catch (error) {
      return this.createErrorResult(`Failed to set cell value: ${String(error)}`);
    }
  }
  setCellFormula(cell, formula, sheet) {
    try {
      this.selectSheet(sheet);
      const { row, col } = this.normalizeCellRef(cell);
      const address = this.rowColToA1(row, col);
      this.goToCell(address);
      const args = JSON.stringify({
        StringName: { type: "string", value: formula }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:EnterString", args);
      const calculatedValue = this.getCellValueInternal();
      return this.createResult({ calculatedValue });
    } catch (error) {
      return this.createErrorResult(`Failed to set formula: ${String(error)}`);
    }
  }
  setCells(range, values, sheet) {
    try {
      this.selectSheet(sheet);
      const { startRow, startCol } = this.normalizeRangeRef(range);
      let cellsUpdated = 0;
      for (let r = 0; r < values.length; r++) {
        const rowValues = values[r];
        if (!rowValues) continue;
        for (let c = 0; c < rowValues.length; c++) {
          const value = rowValues[c];
          if (value === null || value === void 0) continue;
          const address = this.rowColToA1(startRow + r, startCol + c);
          this.goToCell(address);
          const valueStr = typeof value === "number" ? value.toString() : String(value);
          const args = JSON.stringify({
            StringName: { type: "string", value: valueStr }
          });
          this.lok.postUnoCommand(this.docPtr, ".uno:EnterString", args);
          cellsUpdated++;
        }
      }
      return this.createResult({ cellsUpdated });
    } catch (error) {
      return this.createErrorResult(`Failed to set cells: ${String(error)}`);
    }
  }
  // ============================================
  // Clear operations
  // ============================================
  clearCell(cell, sheet) {
    try {
      this.selectSheet(sheet);
      const { row, col } = this.normalizeCellRef(cell);
      const address = this.rowColToA1(row, col);
      this.goToCell(address);
      const oldValue = this.getCellValueInternal();
      this.lok.postUnoCommand(this.docPtr, ".uno:ClearContents");
      return this.createResult({ oldValue });
    } catch (error) {
      return this.createErrorResult(`Failed to clear cell: ${String(error)}`);
    }
  }
  clearRange(range, sheet) {
    try {
      this.selectSheet(sheet);
      const rangeStr = this.normalizeRangeToString(range);
      this.goToCell(rangeStr);
      this.lok.postUnoCommand(this.docPtr, ".uno:ClearContents");
      const { startRow, startCol, endRow, endCol } = this.normalizeRangeRef(range);
      const cellsCleared = (endRow - startRow + 1) * (endCol - startCol + 1);
      return this.createResult({ cellsCleared });
    } catch (error) {
      return this.createErrorResult(`Failed to clear range: ${String(error)}`);
    }
  }
  // ============================================
  // Row/Column operations
  // ============================================
  insertRow(afterRow, sheet) {
    try {
      this.selectSheet(sheet);
      this.goToCell(this.rowColToA1(afterRow + 1, 0));
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertRows");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to insert row: ${String(error)}`);
    }
  }
  insertColumn(afterCol, sheet) {
    try {
      this.selectSheet(sheet);
      const colNum = typeof afterCol === "string" ? this.a1ToRowCol(afterCol + "1").col + 1 : afterCol + 1;
      this.goToCell(this.rowColToA1(0, colNum));
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertColumns");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to insert column: ${String(error)}`);
    }
  }
  deleteRow(row, sheet) {
    try {
      this.selectSheet(sheet);
      this.goToCell(this.rowColToA1(row, 0));
      this.lok.postUnoCommand(this.docPtr, ".uno:DeleteRows");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to delete row: ${String(error)}`);
    }
  }
  deleteColumn(col, sheet) {
    try {
      this.selectSheet(sheet);
      const colNum = typeof col === "string" ? this.a1ToRowCol(col + "1").col : col;
      this.goToCell(this.rowColToA1(0, colNum));
      this.lok.postUnoCommand(this.docPtr, ".uno:DeleteColumns");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to delete column: ${String(error)}`);
    }
  }
  // ============================================
  // Formatting
  // ============================================
  formatCells(range, format, sheet) {
    try {
      this.selectSheet(sheet);
      const rangeStr = this.normalizeRangeToString(range);
      this.goToCell(rangeStr);
      if (format.bold !== void 0) {
        this.lok.postUnoCommand(this.docPtr, ".uno:Bold");
      }
      if (format.numberFormat !== void 0) {
        const args = JSON.stringify({
          NumberFormatValue: { type: "string", value: format.numberFormat }
        });
        this.lok.postUnoCommand(this.docPtr, ".uno:NumberFormatValue", args);
      }
      if (format.backgroundColor !== void 0) {
        const args = JSON.stringify({
          BackgroundColor: { type: "long", value: this.hexToNumber(format.backgroundColor) }
        });
        this.lok.postUnoCommand(this.docPtr, ".uno:BackgroundColor", args);
      }
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to format cells: ${String(error)}`);
    }
  }
  // ============================================
  // Sheet management
  // ============================================
  addSheet(name) {
    try {
      const args = JSON.stringify({
        Name: { type: "string", value: name }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:Insert", args);
      const numSheets = this.lok.documentGetParts(this.docPtr);
      return this.createResult({ index: numSheets - 1 });
    } catch (error) {
      return this.createErrorResult(`Failed to add sheet: ${String(error)}`);
    }
  }
  renameSheet(sheet, newName) {
    try {
      this.selectSheet(sheet);
      const args = JSON.stringify({
        Name: { type: "string", value: newName }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:RenameTable", args);
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to rename sheet: ${String(error)}`);
    }
  }
  deleteSheet(sheet) {
    try {
      this.selectSheet(sheet);
      this.lok.postUnoCommand(this.docPtr, ".uno:Remove");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to delete sheet: ${String(error)}`);
    }
  }
  // ============================================
  // Private helpers
  // ============================================
  selectSheet(sheet) {
    if (sheet === void 0) return;
    const index = typeof sheet === "number" ? sheet : this.getSheetIndexByName(sheet);
    if (index >= 0) {
      this.lok.documentSetPart(this.docPtr, index);
    }
  }
  getSheetIndexByName(name) {
    const numSheets = this.lok.documentGetParts(this.docPtr);
    for (let i = 0; i < numSheets; i++) {
      if (this.lok.getPartName(this.docPtr, i) === name) {
        return i;
      }
    }
    return -1;
  }
  goToCell(address) {
    const args = JSON.stringify({
      ToPoint: { type: "string", value: address }
    });
    this.lok.postUnoCommand(this.docPtr, ".uno:GoToCell", args);
  }
  getCellValueInternal() {
    const text = this.lok.getTextSelection(this.docPtr, "text/plain");
    if (!text) return null;
    const num = parseFloat(text);
    if (!isNaN(num) && text.trim() === num.toString()) {
      return num;
    }
    if (text.toLowerCase() === "true") return true;
    if (text.toLowerCase() === "false") return false;
    return text;
  }
  getCellFormulaInternal() {
    const result = this.lok.getCommandValues(this.docPtr, ".uno:GetFormulaBarText");
    if (!result) return null;
    try {
      const parsed = JSON.parse(result);
      return parsed.value ?? null;
    } catch {
      return null;
    }
  }
  normalizeRangeRef(range) {
    if (typeof range === "string") {
      const parts = range.split(":");
      const start2 = this.a1ToRowCol(parts[0]);
      const end2 = parts[1] ? this.a1ToRowCol(parts[1]) : start2;
      return {
        startRow: start2.row,
        startCol: start2.col,
        endRow: end2.row,
        endCol: end2.col
      };
    }
    const start = this.normalizeCellRef(range.start);
    const end = this.normalizeCellRef(range.end);
    return {
      startRow: start.row,
      startCol: start.col,
      endRow: end.row,
      endCol: end.col
    };
  }
  normalizeRangeToString(range) {
    if (typeof range === "string") return range;
    const start = this.normalizeCellRef(range.start);
    const end = this.normalizeCellRef(range.end);
    return `${this.rowColToA1(start.row, start.col)}:${this.rowColToA1(end.row, end.col)}`;
  }
  hexToNumber(hex) {
    return parseInt(hex.replace("#", ""), 16);
  }
};

// src/editor/impress.ts
var ImpressEditor = class extends OfficeEditor {
  getDocumentType() {
    return "impress";
  }
  getStructure(_options) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      const slides = [];
      for (let i = 0; i < numSlides; i++) {
        const slideData = this.getSlideInfoInternal(i);
        slides.push(slideData);
      }
      const structure = {
        type: "impress",
        slides,
        slideCount: numSlides
      };
      return this.createResult(structure);
    } catch (error) {
      return this.createErrorResult(`Failed to get structure: ${String(error)}`);
    }
  }
  // ============================================
  // Slide reading
  // ============================================
  getSlide(index) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      if (index < 0 || index >= numSlides) {
        return this.createErrorResult(
          `Invalid slide index: ${index}. Valid range: 0-${numSlides - 1}`,
          "Use getStructure() to see available slides"
        );
      }
      this.lok.documentSetPart(this.docPtr, index);
      const text = this.lok.getAllText(this.docPtr) || "";
      const textFrames = this.parseTextFrames(text);
      const slideData = {
        index,
        title: textFrames.find((f) => f.type === "title")?.text,
        textFrames,
        hasNotes: false
        // Could detect from LOK if available
      };
      return this.createResult(slideData);
    } catch (error) {
      return this.createErrorResult(`Failed to get slide: ${String(error)}`);
    }
  }
  getSlideCount() {
    try {
      const count = this.lok.documentGetParts(this.docPtr);
      return this.createResult(count);
    } catch (error) {
      return this.createErrorResult(`Failed to get slide count: ${String(error)}`);
    }
  }
  // ============================================
  // Slide management
  // ============================================
  addSlide(options) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      if (options?.afterSlide !== void 0) {
        this.lok.documentSetPart(this.docPtr, options.afterSlide);
      } else {
        this.lok.documentSetPart(this.docPtr, numSlides - 1);
      }
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertPage");
      if (options?.layout) {
        this.applySlideLayout(options.layout);
      }
      const newIndex = options?.afterSlide !== void 0 ? options.afterSlide + 1 : numSlides;
      const newNumSlides = this.lok.documentGetParts(this.docPtr);
      const verified = newNumSlides > numSlides;
      return {
        success: true,
        verified,
        data: { index: newIndex }
      };
    } catch (error) {
      return this.createErrorResult(`Failed to add slide: ${String(error)}`);
    }
  }
  deleteSlide(index) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      if (numSlides <= 1) {
        return this.createErrorResult(
          "Cannot delete the last slide",
          "A presentation must have at least one slide"
        );
      }
      if (index < 0 || index >= numSlides) {
        return this.createErrorResult(
          `Invalid slide index: ${index}`,
          `Valid range: 0-${numSlides - 1}`
        );
      }
      this.lok.documentSetPart(this.docPtr, index);
      this.lok.postUnoCommand(this.docPtr, ".uno:DeletePage");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to delete slide: ${String(error)}`);
    }
  }
  duplicateSlide(index) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      if (index < 0 || index >= numSlides) {
        return this.createErrorResult(
          `Invalid slide index: ${index}`,
          `Valid range: 0-${numSlides - 1}`
        );
      }
      this.lok.documentSetPart(this.docPtr, index);
      this.lok.postUnoCommand(this.docPtr, ".uno:DuplicatePage");
      return this.createResult({ newIndex: index + 1 });
    } catch (error) {
      return this.createErrorResult(`Failed to duplicate slide: ${String(error)}`);
    }
  }
  moveSlide(fromIndex, toIndex) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      if (fromIndex < 0 || fromIndex >= numSlides || toIndex < 0 || toIndex >= numSlides) {
        return this.createErrorResult(
          `Invalid slide indices. Valid range: 0-${numSlides - 1}`,
          "Check slide indices are within bounds"
        );
      }
      if (fromIndex === toIndex) {
        return this.createErrorResult(
          "Source and destination are the same",
          "Provide different indices to move"
        );
      }
      this.lok.documentSetPart(this.docPtr, fromIndex);
      const args = JSON.stringify({
        Position: { type: "long", value: toIndex }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:MovePageFirst", args);
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to move slide: ${String(error)}`);
    }
  }
  // ============================================
  // Slide content editing
  // ============================================
  setSlideTitle(index, title) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      if (index < 0 || index >= numSlides) {
        return this.createErrorResult(`Invalid slide index: ${index}`);
      }
      this.lok.documentSetPart(this.docPtr, index);
      const text = this.lok.getAllText(this.docPtr) || "";
      const frames = this.parseTextFrames(text);
      const oldTitle = frames.find((f) => f.type === "title")?.text;
      this.lok.postUnoCommand(this.docPtr, ".uno:SelectAll");
      const args = JSON.stringify({
        Text: { type: "string", value: title }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertText", args);
      return this.createResult({ oldTitle });
    } catch (error) {
      return this.createErrorResult(`Failed to set slide title: ${String(error)}`);
    }
  }
  setSlideBody(index, body) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      if (index < 0 || index >= numSlides) {
        return this.createErrorResult(`Invalid slide index: ${index}`);
      }
      this.lok.documentSetPart(this.docPtr, index);
      const text = this.lok.getAllText(this.docPtr) || "";
      const frames = this.parseTextFrames(text);
      const oldBody = frames.find((f) => f.type === "body")?.text;
      this.lok.postUnoCommand(this.docPtr, ".uno:NextObject");
      const args = JSON.stringify({
        Text: { type: "string", value: body }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertText", args);
      return this.createResult({ oldBody });
    } catch (error) {
      return this.createErrorResult(`Failed to set slide body: ${String(error)}`);
    }
  }
  setSlideNotes(index, notes) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      if (index < 0 || index >= numSlides) {
        return this.createErrorResult(`Invalid slide index: ${index}`);
      }
      this.lok.documentSetPart(this.docPtr, index);
      this.lok.postUnoCommand(this.docPtr, ".uno:NotesMode");
      const args = JSON.stringify({
        Text: { type: "string", value: notes }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertText", args);
      this.lok.postUnoCommand(this.docPtr, ".uno:NormalViewMode");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to set slide notes: ${String(error)}`);
    }
  }
  // ============================================
  // Slide layout
  // ============================================
  setSlideLayout(index, layout) {
    try {
      const numSlides = this.lok.documentGetParts(this.docPtr);
      if (index < 0 || index >= numSlides) {
        return this.createErrorResult(`Invalid slide index: ${index}`);
      }
      this.lok.documentSetPart(this.docPtr, index);
      this.applySlideLayout(layout);
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to set slide layout: ${String(error)}`);
    }
  }
  // ============================================
  // Private helpers
  // ============================================
  getSlideInfoInternal(index) {
    this.lok.documentSetPart(this.docPtr, index);
    const text = this.lok.getAllText(this.docPtr) || "";
    const frames = this.parseTextFrames(text);
    const titleFrame = frames.find((f) => f.type === "title");
    return {
      index,
      title: titleFrame?.text,
      layout: this.detectLayout(frames),
      textFrameCount: frames.length
    };
  }
  parseTextFrames(text) {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
    const frames = [];
    paragraphs.forEach((para, idx) => {
      const type = idx === 0 ? "title" : idx === 1 ? "body" : "other";
      frames.push({
        index: idx,
        type,
        text: para.trim(),
        bounds: { x: 0, y: 0, width: 0, height: 0 }
        // Would need LOK API for actual bounds
      });
    });
    return frames;
  }
  detectLayout(frames) {
    if (frames.length === 0) return "blank";
    if (frames.length === 1 && frames[0]?.type === "title") return "title";
    if (frames.length >= 2) return "titleContent";
    return "blank";
  }
  applySlideLayout(layout) {
    const layoutMap = {
      blank: 0,
      title: 1,
      titleContent: 2,
      twoColumn: 3
    };
    const layoutId = layoutMap[layout] ?? 0;
    const args = JSON.stringify({
      WhatLayout: { type: "long", value: layoutId }
    });
    this.lok.postUnoCommand(this.docPtr, ".uno:AssignLayout", args);
  }
};

// src/editor/draw.ts
var DrawEditor = class extends OfficeEditor {
  isImportedPdf = false;
  getDocumentType() {
    return "draw";
  }
  setImportedPdf(value) {
    this.isImportedPdf = value;
  }
  getStructure(_options) {
    try {
      const numPages = this.lok.documentGetParts(this.docPtr);
      const pages = [];
      for (let i = 0; i < numPages; i++) {
        const pageInfo = this.getPageInfoInternal(i);
        pages.push(pageInfo);
      }
      const structure = {
        type: "draw",
        pages,
        pageCount: numPages,
        isImportedPdf: this.isImportedPdf
      };
      return this.createResult(structure);
    } catch (error) {
      return this.createErrorResult(`Failed to get structure: ${String(error)}`);
    }
  }
  // ============================================
  // Page reading
  // ============================================
  getPage(index) {
    try {
      const numPages = this.lok.documentGetParts(this.docPtr);
      if (index < 0 || index >= numPages) {
        return this.createErrorResult(
          `Invalid page index: ${index}. Valid range: 0-${numPages - 1}`,
          "Use getStructure() to see available pages"
        );
      }
      this.lok.documentSetPart(this.docPtr, index);
      const size = this.lok.documentGetDocumentSize(this.docPtr);
      const shapes = this.getShapesOnPage();
      const pageData = {
        index,
        shapes,
        size: { width: size.width, height: size.height }
      };
      return this.createResult(pageData);
    } catch (error) {
      return this.createErrorResult(`Failed to get page: ${String(error)}`);
    }
  }
  getPageCount() {
    try {
      const count = this.lok.documentGetParts(this.docPtr);
      return this.createResult(count);
    } catch (error) {
      return this.createErrorResult(`Failed to get page count: ${String(error)}`);
    }
  }
  // ============================================
  // Page management
  // ============================================
  addPage(options) {
    try {
      const numPages = this.lok.documentGetParts(this.docPtr);
      if (options?.afterPage !== void 0) {
        this.lok.documentSetPart(this.docPtr, options.afterPage);
      } else {
        this.lok.documentSetPart(this.docPtr, numPages - 1);
      }
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertPage");
      const newIndex = options?.afterPage !== void 0 ? options.afterPage + 1 : numPages;
      return this.createResult({ index: newIndex });
    } catch (error) {
      return this.createErrorResult(`Failed to add page: ${String(error)}`);
    }
  }
  deletePage(index) {
    try {
      const numPages = this.lok.documentGetParts(this.docPtr);
      if (numPages <= 1) {
        return this.createErrorResult(
          "Cannot delete the last page",
          "A drawing document must have at least one page"
        );
      }
      if (index < 0 || index >= numPages) {
        return this.createErrorResult(
          `Invalid page index: ${index}`,
          `Valid range: 0-${numPages - 1}`
        );
      }
      this.lok.documentSetPart(this.docPtr, index);
      this.lok.postUnoCommand(this.docPtr, ".uno:DeletePage");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to delete page: ${String(error)}`);
    }
  }
  duplicatePage(index) {
    try {
      const numPages = this.lok.documentGetParts(this.docPtr);
      if (index < 0 || index >= numPages) {
        return this.createErrorResult(
          `Invalid page index: ${index}`,
          `Valid range: 0-${numPages - 1}`
        );
      }
      this.lok.documentSetPart(this.docPtr, index);
      this.lok.postUnoCommand(this.docPtr, ".uno:DuplicatePage");
      return this.createResult({ newIndex: index + 1 });
    } catch (error) {
      return this.createErrorResult(`Failed to duplicate page: ${String(error)}`);
    }
  }
  // ============================================
  // Shape operations
  // ============================================
  addShape(pageIndex, shapeType, bounds, options) {
    try {
      const numPages = this.lok.documentGetParts(this.docPtr);
      if (pageIndex < 0 || pageIndex >= numPages) {
        return this.createErrorResult(`Invalid page index: ${pageIndex}`);
      }
      this.lok.documentSetPart(this.docPtr, pageIndex);
      const shapeCommand = this.getShapeCommand(shapeType);
      const boundsArgs = JSON.stringify({
        X: { type: "long", value: bounds.x },
        Y: { type: "long", value: bounds.y },
        Width: { type: "long", value: bounds.width },
        Height: { type: "long", value: bounds.height }
      });
      this.lok.postUnoCommand(this.docPtr, shapeCommand, boundsArgs);
      if (options?.text) {
        const textArgs = JSON.stringify({
          Text: { type: "string", value: options.text }
        });
        this.lok.postUnoCommand(this.docPtr, ".uno:InsertText", textArgs);
      }
      if (options?.fillColor) {
        const colorArgs = JSON.stringify({
          FillColor: { type: "long", value: this.hexToNumber(options.fillColor) }
        });
        this.lok.postUnoCommand(this.docPtr, ".uno:FillColor", colorArgs);
      }
      if (options?.lineColor) {
        const colorArgs = JSON.stringify({
          LineColor: { type: "long", value: this.hexToNumber(options.lineColor) }
        });
        this.lok.postUnoCommand(this.docPtr, ".uno:XLineColor", colorArgs);
      }
      return this.createResult({ shapeIndex: 0 });
    } catch (error) {
      return this.createErrorResult(`Failed to add shape: ${String(error)}`);
    }
  }
  addLine(pageIndex, start, end, options) {
    try {
      const numPages = this.lok.documentGetParts(this.docPtr);
      if (pageIndex < 0 || pageIndex >= numPages) {
        return this.createErrorResult(`Invalid page index: ${pageIndex}`);
      }
      this.lok.documentSetPart(this.docPtr, pageIndex);
      const args = JSON.stringify({
        StartX: { type: "long", value: start.x },
        StartY: { type: "long", value: start.y },
        EndX: { type: "long", value: end.x },
        EndY: { type: "long", value: end.y }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:Line", args);
      if (options?.lineColor) {
        const colorArgs = JSON.stringify({
          LineColor: { type: "long", value: this.hexToNumber(options.lineColor) }
        });
        this.lok.postUnoCommand(this.docPtr, ".uno:XLineColor", colorArgs);
      }
      if (options?.lineWidth) {
        const widthArgs = JSON.stringify({
          LineWidth: { type: "long", value: options.lineWidth }
        });
        this.lok.postUnoCommand(this.docPtr, ".uno:LineWidth", widthArgs);
      }
      return this.createResult({ shapeIndex: 0 });
    } catch (error) {
      return this.createErrorResult(`Failed to add line: ${String(error)}`);
    }
  }
  deleteShape(pageIndex, shapeIndex) {
    try {
      this.lok.documentSetPart(this.docPtr, pageIndex);
      this.selectShape(shapeIndex);
      this.lok.postUnoCommand(this.docPtr, ".uno:Delete");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to delete shape: ${String(error)}`);
    }
  }
  setShapeText(pageIndex, shapeIndex, text) {
    try {
      this.lok.documentSetPart(this.docPtr, pageIndex);
      this.selectShape(shapeIndex);
      this.lok.postUnoCommand(this.docPtr, ".uno:EnterGroup");
      this.lok.postUnoCommand(this.docPtr, ".uno:SelectAll");
      const args = JSON.stringify({
        Text: { type: "string", value: text }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:InsertText", args);
      this.lok.postUnoCommand(this.docPtr, ".uno:LeaveGroup");
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to set shape text: ${String(error)}`);
    }
  }
  moveShape(pageIndex, shapeIndex, newPosition) {
    try {
      this.lok.documentSetPart(this.docPtr, pageIndex);
      this.selectShape(shapeIndex);
      const args = JSON.stringify({
        X: { type: "long", value: newPosition.x },
        Y: { type: "long", value: newPosition.y }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:SetObjectPosition", args);
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to move shape: ${String(error)}`);
    }
  }
  resizeShape(pageIndex, shapeIndex, newSize) {
    try {
      this.lok.documentSetPart(this.docPtr, pageIndex);
      this.selectShape(shapeIndex);
      const args = JSON.stringify({
        Width: { type: "long", value: newSize.width },
        Height: { type: "long", value: newSize.height }
      });
      this.lok.postUnoCommand(this.docPtr, ".uno:Size", args);
      return this.createResult(void 0);
    } catch (error) {
      return this.createErrorResult(`Failed to resize shape: ${String(error)}`);
    }
  }
  // ============================================
  // Private helpers
  // ============================================
  getPageInfoInternal(index) {
    this.lok.documentSetPart(this.docPtr, index);
    const size = this.lok.documentGetDocumentSize(this.docPtr);
    const shapes = this.getShapesOnPage();
    return {
      index,
      shapeCount: shapes.length,
      size: { width: size.width, height: size.height }
    };
  }
  getShapesOnPage() {
    const text = this.lok.getAllText(this.docPtr) || "";
    if (!text.trim()) {
      return [];
    }
    return [{
      index: 0,
      type: "text",
      text,
      bounds: { x: 0, y: 0, width: 0, height: 0 }
    }];
  }
  selectShape(shapeIndex) {
    const args = JSON.stringify({
      Index: { type: "long", value: shapeIndex }
    });
    this.lok.postUnoCommand(this.docPtr, ".uno:SelectObject", args);
  }
  getShapeCommand(shapeType) {
    const commands = {
      rectangle: ".uno:Rect",
      ellipse: ".uno:Ellipse",
      line: ".uno:Line",
      text: ".uno:Text",
      image: ".uno:InsertGraphic",
      group: ".uno:FormatGroup",
      other: ".uno:Rect"
      // Default to rectangle
    };
    return commands[shapeType];
  }
  hexToNumber(hex) {
    return parseInt(hex.replace("#", ""), 16);
  }
};

// src/editor/index.ts
var LOK_DOCTYPE_TEXT = 0;
var LOK_DOCTYPE_SPREADSHEET = 1;
var LOK_DOCTYPE_PRESENTATION = 2;
var LOK_DOCTYPE_DRAWING = 3;
function createEditor(lok, docPtr, options) {
  const docType = lok.documentGetDocumentType(docPtr);
  switch (docType) {
    case LOK_DOCTYPE_TEXT:
      return new WriterEditor(lok, docPtr, options);
    case LOK_DOCTYPE_SPREADSHEET:
      return new CalcEditor(lok, docPtr, options);
    case LOK_DOCTYPE_PRESENTATION:
      return new ImpressEditor(lok, docPtr, options);
    case LOK_DOCTYPE_DRAWING:
      return new DrawEditor(lok, docPtr, options);
    default:
      throw new Error(`Unsupported document type: ${docType}`);
  }
}

// src/node-worker-protocol.ts
function createNodeWorkerConversionOptions(payload) {
  return {
    inputFormat: payload.inputFormat,
    outputFormat: payload.outputFormat,
    ...payload.filterOptions === void 0 ? {} : { filterOptions: payload.filterOptions },
    ...payload.password === void 0 ? {} : { password: payload.password }
  };
}
function normalizeNodeWorkerError(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return String(error);
  } catch {
    return "Unknown worker error";
  }
}
function shouldQuarantineNodeRuntime(runtime) {
  return runtime !== null && !runtime.isReady();
}
function createNodeWorkerFailureResponse(id, operation, error, runtime) {
  const quarantine = operation === "convert" && shouldQuarantineNodeRuntime(runtime);
  return {
    id,
    success: false,
    error: normalizeNodeWorkerError(error),
    ...quarantine ? { quarantine: true } : {}
  };
}

// src/node.worker.ts
var wasmLoader = __require("../wasm/loader.cjs");
var converter = null;
var editorSessions = /* @__PURE__ */ new Map();
var sessionCounter = 0;
async function handleInit(payload) {
  if (converter?.isReady()) {
    return;
  }
  converter = new LibreOfficeConverter({
    wasmPath: payload.wasmPath,
    verbose: payload.verbose,
    wasmLoader
  });
  await converter.initialize();
}
async function handleConvert(payload) {
  if (!converter?.isReady()) {
    throw new Error("Worker not initialized");
  }
  const result = await converter.convert(
    payload.inputData,
    createNodeWorkerConversionOptions(payload),
    payload.filename || "document"
  );
  return result.data;
}
async function handleGetPageCount(payload) {
  if (!converter?.isReady()) {
    throw new Error("Worker not initialized");
  }
  const options = {
    inputFormat: payload.inputFormat,
    outputFormat: "pdf"
    // Required but not used for page count
  };
  return converter.getPageCount(payload.inputData, options);
}
async function handleGetDocumentInfo(payload) {
  if (!converter?.isReady()) {
    throw new Error("Worker not initialized");
  }
  const options = {
    inputFormat: payload.inputFormat,
    outputFormat: "pdf"
    // Required but not used for document info
  };
  return converter.getDocumentInfo(payload.inputData, options);
}
async function handleRenderPage(payload) {
  if (!converter?.isReady()) {
    throw new Error("Worker not initialized");
  }
  const previews = await converter.renderPagePreviews(
    payload.inputData,
    { inputFormat: payload.inputFormat },
    {
      width: payload.width,
      height: payload.height,
      pageIndices: [payload.pageIndex]
    }
  );
  if (previews.length === 0) {
    throw new Error(`Page ${payload.pageIndex} not found`);
  }
  const preview = previews[0];
  return {
    data: preview.data,
    width: preview.width,
    height: preview.height
  };
}
async function handleRenderPagePreviews(payload) {
  if (!converter?.isReady()) {
    throw new Error("Worker not initialized");
  }
  return converter.renderPagePreviews(
    payload.inputData,
    { inputFormat: payload.inputFormat },
    {
      width: payload.width,
      height: payload.height,
      pageIndices: payload.pageIndices
    }
  );
}
async function handleRenderPageFullQuality(payload) {
  if (!converter?.isReady()) {
    throw new Error("Worker not initialized");
  }
  return converter.renderPageFullQuality(
    payload.inputData,
    { inputFormat: payload.inputFormat },
    payload.pageIndex,
    {
      dpi: payload.dpi,
      maxDimension: payload.maxDimension,
      editMode: payload.editMode ?? false
    }
  );
}
async function handleGetDocumentText(payload) {
  if (!converter?.isReady()) {
    throw new Error("Worker not initialized");
  }
  const options = {
    inputFormat: payload.inputFormat,
    outputFormat: "pdf"
    // Required but not used for text extraction
  };
  return converter.getDocumentText(payload.inputData, options);
}
async function handleGetPageNames(payload) {
  if (!converter?.isReady()) {
    throw new Error("Worker not initialized");
  }
  const options = {
    inputFormat: payload.inputFormat,
    outputFormat: "pdf"
    // Required but not used for page names
  };
  return converter.getPageNames(payload.inputData, options);
}
async function handleOpenDocument(payload) {
  if (!converter?.isReady()) {
    throw new Error("Worker not initialized");
  }
  const lokBindings = converter.getLokBindings();
  const module = converter.getModule();
  if (!lokBindings || !module) {
    throw new Error("LOK bindings not available");
  }
  const sessionId = `session_${++sessionCounter}_${Date.now()}`;
  const filePath = `/tmp/edit_${sessionId}.${payload.inputFormat}`;
  module.FS.writeFile(filePath, payload.inputData);
  const loadOptions = buildLoadOptions(payload.inputFormat);
  let docPtr;
  if (loadOptions) {
    docPtr = lokBindings.documentLoadWithOptions(filePath, loadOptions);
  } else {
    docPtr = lokBindings.documentLoad(filePath);
  }
  if (docPtr === 0) {
    const error = lokBindings.getError();
    module.FS.unlink(filePath);
    throw new Error(`Failed to load document: ${String(error)}`);
  }
  lokBindings.documentInitializeForRendering(docPtr);
  const viewId = lokBindings.createView(docPtr);
  lokBindings.setView(docPtr, viewId);
  lokBindings.registerCallback(docPtr);
  lokBindings.postUnoCommand(docPtr, ".uno:Edit");
  const editor = createEditor(lokBindings, docPtr);
  const documentType = editor.getDocumentType();
  const pageCount = lokBindings.documentGetParts(docPtr);
  editorSessions.set(sessionId, {
    sessionId,
    docPtr,
    filePath,
    editor,
    documentType
  });
  return {
    sessionId,
    documentType,
    pageCount
  };
}
async function handleEditorOperation(payload) {
  const session = editorSessions.get(payload.sessionId);
  if (!session) {
    throw new Error(`Session not found: ${payload.sessionId}`);
  }
  const { editor } = session;
  const args = payload.args || [];
  const method = editor[payload.method];
  if (typeof method !== "function") {
    throw new Error(`Unknown editor method: ${payload.method}`);
  }
  const result = method.apply(editor, args);
  let serializedData = result.data;
  if (result.data instanceof Map) {
    serializedData = Object.fromEntries(result.data);
  }
  return {
    success: result.success,
    verified: result.verified,
    data: serializedData,
    error: result.error,
    suggestion: result.suggestion
  };
}
async function handleCloseDocument(payload) {
  const session = editorSessions.get(payload.sessionId);
  if (!session) {
    throw new Error(`Session not found: ${payload.sessionId}`);
  }
  const lokBindings = converter?.getLokBindings();
  const module = converter?.getModule();
  const { docPtr, filePath } = session;
  let modifiedData;
  if (module && lokBindings) {
    try {
      const ext = filePath.split(".").pop() || "docx";
      lokBindings.documentSaveAs(docPtr, filePath, ext, "");
      modifiedData = module.FS.readFile(filePath);
    } catch (e) {
      console.warn("[Worker] Could not save document:", e);
    }
  }
  if (lokBindings && docPtr !== 0) {
    try {
      lokBindings.unregisterCallback(docPtr);
    } catch {
    }
    try {
      lokBindings.documentDestroy(docPtr);
    } catch {
    }
  }
  if (module) {
    try {
      module.FS.unlink(filePath);
    } catch {
    }
  }
  editorSessions.delete(payload.sessionId);
  return modifiedData;
}
async function handleDestroy() {
  for (const [, session] of editorSessions) {
    try {
      const lokBindings = converter?.getLokBindings();
      const module = converter?.getModule();
      if (lokBindings && session.docPtr !== 0) {
        try {
          lokBindings.unregisterCallback(session.docPtr);
        } catch {
        }
        try {
          lokBindings.documentDestroy(session.docPtr);
        } catch {
        }
      }
      if (module) {
        try {
          module.FS.unlink(session.filePath);
        } catch {
        }
      }
    } catch {
    }
  }
  editorSessions.clear();
  if (converter) {
    await converter.destroy();
    converter = null;
  }
}
worker_threads.parentPort?.on("message", async (message) => {
  try {
    let result;
    switch (message.type) {
      case "init":
        await handleInit(message.payload);
        break;
      case "convert":
        result = await handleConvert(message.payload);
        break;
      case "getPageCount":
        result = await handleGetPageCount(message.payload);
        break;
      case "getDocumentInfo":
        result = await handleGetDocumentInfo(message.payload);
        break;
      case "renderPage":
        result = await handleRenderPage(message.payload);
        break;
      case "renderPagePreviews":
        result = await handleRenderPagePreviews(message.payload);
        break;
      case "renderPageFullQuality":
        result = await handleRenderPageFullQuality(message.payload);
        break;
      case "getDocumentText":
        result = await handleGetDocumentText(message.payload);
        break;
      case "getPageNames":
        result = await handleGetPageNames(message.payload);
        break;
      case "openDocument":
        result = await handleOpenDocument(message.payload);
        break;
      case "editorOperation":
        result = await handleEditorOperation(message.payload);
        break;
      case "closeDocument":
        result = await handleCloseDocument(message.payload);
        break;
      case "destroy":
        await handleDestroy();
        break;
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
    worker_threads.parentPort?.postMessage({
      id: message.id,
      success: true,
      data: result
    });
  } catch (error) {
    worker_threads.parentPort?.postMessage(
      createNodeWorkerFailureResponse(message.id, message.type, error, converter)
    );
  }
});
worker_threads.parentPort?.postMessage({ type: "ready" });
//# sourceMappingURL=node.worker.cjs.map
//# sourceMappingURL=node.worker.cjs.map