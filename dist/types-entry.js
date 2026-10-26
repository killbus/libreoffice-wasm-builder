// src/types.ts
var FONT_PROFILE_SCHEMA_VERSION = 1;
var EMPTY_FONT_PROFILE_FINGERPRINT = "sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945";
var DEFAULT_WASM_BASE_URL = "/wasm/";
function createWasmPaths(baseUrl = DEFAULT_WASM_BASE_URL) {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return {
    sofficeJs: `${base}soffice.js`,
    sofficeWasm: `${base}soffice.wasm`,
    sofficeData: `${base}soffice.data`
  };
}
var ConversionErrorCode = /* @__PURE__ */ ((ConversionErrorCode2) => {
  ConversionErrorCode2["UNKNOWN"] = "UNKNOWN";
  ConversionErrorCode2["INVALID_INPUT"] = "INVALID_INPUT";
  ConversionErrorCode2["UNSUPPORTED_FORMAT"] = "UNSUPPORTED_FORMAT";
  ConversionErrorCode2["CORRUPTED_DOCUMENT"] = "CORRUPTED_DOCUMENT";
  ConversionErrorCode2["PASSWORD_REQUIRED"] = "PASSWORD_REQUIRED";
  ConversionErrorCode2["WASM_NOT_INITIALIZED"] = "WASM_NOT_INITIALIZED";
  ConversionErrorCode2["CONVERSION_FAILED"] = "CONVERSION_FAILED";
  ConversionErrorCode2["LOAD_FAILED"] = "LOAD_FAILED";
  return ConversionErrorCode2;
})(ConversionErrorCode || {});
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

export { CATEGORY_OUTPUT_FORMATS, ConversionError, ConversionErrorCode, DEFAULT_WASM_BASE_URL, EMPTY_FONT_PROFILE_FINGERPRINT, EXTENSION_TO_FORMAT, FONT_PROFILE_SCHEMA_VERSION, FORMAT_FILTERS, FORMAT_MIME_TYPES, INPUT_FORMAT_CATEGORY, createWasmPaths, getConversionErrorMessage, getValidOutputFormats, isConversionValid };
//# sourceMappingURL=types-entry.js.map
//# sourceMappingURL=types-entry.js.map