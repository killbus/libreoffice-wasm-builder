import { L as LibreOfficeWasmOptions, I as ILibreOfficeConverter, C as ConversionOptions, a as ConversionResult } from './image-utils-f67Pl7K-.js';
export { W as CATEGORY_OUTPUT_FORMATS, G as ConversionError, H as ConversionErrorCode, Y as DEFAULT_WASM_BASE_URL, Z as DocumentCategory, R as EXTENSION_TO_FORMAT, M as FORMAT_FILTERS, Q as FORMAT_MIME_TYPES, D as FilterOptions, F as FontData, V as INPUT_FORMAT_CATEGORY, n as ImageEncodeOptions, c as ImageOptions, b as InputFormat, O as OutputFormat, P as PdfOptions, E as ProgressInfo, _ as WasmLoadPhase, $ as WasmLoadProgress, X as createWasmPaths, h as encodeImage, U as getConversionErrorMessage, m as getSharp, S as getValidOutputFormats, T as isConversionValid, k as isSharpAvailable, d as loadFontsFromDirectory, f as loadFontsFromPackage, g as loadFontsFromPackages, l as loadFontsFromZip, e as loadSystemFonts, i as rgbaToJpeg, r as rgbaToPng, j as rgbaToWebp } from './image-utils-f67Pl7K-.js';

/**
 * LibreOffice WASM Document Converter - Server/Node.js Entry Point
 *
 * This entry point exports the conversion-only Node.js surface and utilities.
 * Use this for server-side code (API routes, server components, etc.)
 *
 * @example
 * ```typescript
 * // In Next.js API routes or server components
 * import { createConverter } from '@killbus/libreoffice-converter/server';
 *
 * const converter = await createConverter({ wasmPath: './wasm' });
 * const result = await converter.convert(docxBuffer, { outputFormat: 'pdf' });
 * ```
 *
 * @packageDocumentation
 */

/**
 * Create a configured LibreOffice converter instance
 */
declare function createConverter(options?: LibreOfficeWasmOptions): Promise<ILibreOfficeConverter>;
/**
 * Quick conversion utility - creates converter, converts, then destroys
 * Uses SubprocessConverter to isolate native runtime state
 */
declare function convertDocument(input: Uint8Array | ArrayBuffer | Buffer, options: ConversionOptions, converterOptions?: LibreOfficeWasmOptions): Promise<ConversionResult>;

export { ConversionOptions, ConversionResult, ILibreOfficeConverter, LibreOfficeWasmOptions, convertDocument, createConverter };
