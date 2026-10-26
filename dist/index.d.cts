import { L as LibreOfficeWasmOptions, I as ILibreOfficeConverter, C as ConversionOptions, a as ConversionResult, b as InputFormat, c as ImageOptions, O as OutputFormat } from './image-utils-f67Pl7K-.cjs';
export { W as CATEGORY_OUTPUT_FORMATS, G as ConversionError, H as ConversionErrorCode, Y as DEFAULT_WASM_BASE_URL, Z as DocumentCategory, J as EMPTY_FONT_PROFILE_FINGERPRINT, R as EXTENSION_TO_FORMAT, K as FONT_PROFILE_SCHEMA_VERSION, M as FORMAT_FILTERS, Q as FORMAT_MIME_TYPES, D as FilterOptions, F as FontData, o as FontProfileDiagnostics, p as FontProfileFont, q as FontProfileMutationDisposition, s as FontProfileRequest, t as FontProfileResult, u as FontProfileResultCode, v as FontProfileRollbackDisposition, w as FontProfileRuntimeIdentity, x as FontProfileStage, y as IFontProfileConverter, V as INPUT_FORMAT_CATEGORY, n as ImageEncodeOptions, N as NativeFontProfileDiagnostics, z as NativeFontProfileManifestEntry, A as NativeFontProfileRequest, B as NativeFontProfileResult, P as PdfOptions, E as ProgressInfo, _ as WasmLoadPhase, $ as WasmLoadProgress, X as createWasmPaths, h as encodeImage, U as getConversionErrorMessage, m as getSharp, S as getValidOutputFormats, T as isConversionValid, k as isSharpAvailable, d as loadFontsFromDirectory, f as loadFontsFromPackage, g as loadFontsFromPackages, l as loadFontsFromZip, e as loadSystemFonts, i as rgbaToJpeg, r as rgbaToPng, j as rgbaToWebp } from './image-utils-f67Pl7K-.cjs';

/**
 * LibreOffice WASM Document Converter
 *
 * A headless document conversion toolkit that uses LibreOffice
 * compiled to WebAssembly. Supports conversion between various
 * document formats without any UI dependencies.
 *
 * @packageDocumentation
 */

/**
 * Image format options for exportAsImage
 */
type ImageFormat = 'png' | 'svg';
/**
 * Create a configured LibreOffice converter instance
 *
 * @example
 * ```typescript
 * import { createConverter } from '@killbus/libreoffice-converter';
 *
 * const converter = await createConverter({
 *   wasmPath: './wasm',
 *   verbose: true,
 * });
 *
 * const pdfData = await converter.convert(docxBuffer, {
 *   outputFormat: 'pdf',
 * });
 * ```
 */
declare function createConverter(options?: LibreOfficeWasmOptions): Promise<ILibreOfficeConverter>;
/**
 * Quick conversion utility - creates converter, converts, then destroys
 *
 * In Node.js, uses SubprocessConverter for clean process exit.
 * In browsers, uses LibreOfficeConverter directly.
 *
 * @example
 * ```typescript
 * import { convertDocument } from '@killbus/libreoffice-converter';
 *
 * const pdfData = await convertDocument(docxBuffer, {
 *   outputFormat: 'pdf',
 *   pdf: { pdfaLevel: 'PDF/A-2b' }
 * });
 * ```
 */
declare function convertDocument(input: Uint8Array | ArrayBuffer | Buffer, options: ConversionOptions, converterOptions?: LibreOfficeWasmOptions): Promise<ConversionResult>;
/**
 * Export document pages as images - creates converter, exports specified pages, then destroys
 *
 * @param input - Document buffer
 * @param inputFormat - Explicit input format; image export never guesses DOCX
 * @param pages - Page index or array of page indices to export (0-indexed)
 * @param format - Output format: 'png' or 'svg'
 * @param imageOptions - Image options (width, height, dpi)
 * @param converterOptions - Converter options (wasmPath, etc.)
 * @returns Array of ConversionResult, one per page
 *
 * @example
 * ```typescript
 * import { exportAsImage } from '@killbus/libreoffice-converter';
 *
 * // Export single page (0-indexed)
 * const [cover] = await exportAsImage(docxBuffer, 'docx', 0, 'png');
 * fs.writeFileSync('cover.png', cover.data);
 *
 * // Export multiple pages
 * const slides = await exportAsImage(pptxBuffer, 'pptx', [0, 1, 2], 'png');
 * slides.forEach((img, i) => fs.writeFileSync(`slide-${i}.png`, img.data));
 *
 * // Export with options
 * const highRes = await exportAsImage(pptxBuffer, 'pptx', [0, 1, 2], 'png', {
 *   dpi: 300,
 *   width: 1920
 * });
 * ```
 */
declare function exportAsImage(input: Uint8Array | ArrayBuffer | Buffer, inputFormat: InputFormat, pages: number | number[], format?: ImageFormat, imageOptions?: Omit<ImageOptions, 'pageIndex'>, converterOptions?: LibreOfficeWasmOptions): Promise<ConversionResult[]>;
/**
 * Check if a format is supported for input
 */
declare function isInputFormatSupported(format: string): boolean;
/**
 * Check if a format is supported for output
 */
declare function isOutputFormatSupported(format: string): boolean;
/**
 * Check if a specific conversion path is supported
 * @param inputFormat The input document format (e.g., 'pdf', 'docx')
 * @param outputFormat The desired output format (e.g., 'pdf', 'docx')
 * @returns true if the conversion is supported
 *
 * @example
 * ```typescript
 * import { isConversionSupported } from '@killbus/libreoffice-converter';
 *
 * isConversionSupported('docx', 'pdf');  // true
 * isConversionSupported('pdf', 'docx');  // false - PDFs can't be converted to DOCX
 * isConversionSupported('xlsx', 'csv');  // true
 * ```
 */
declare function isConversionSupported(inputFormat: string, outputFormat: string): boolean;
/**
 * Get valid output formats for a given input format
 * @param inputFormat The input document format
 * @returns Array of valid output formats
 *
 * @example
 * ```typescript
 * import { getValidOutputFormatsFor } from '@killbus/libreoffice-converter';
 *
 * getValidOutputFormatsFor('docx');  // ['pdf', 'docx', 'doc', 'odt', 'rtf', 'txt', 'png']
 * getValidOutputFormatsFor('pdf');   // ['pdf', 'png', 'svg', 'html']
 * getValidOutputFormatsFor('xlsx');  // ['pdf', 'xlsx', 'xls', 'ods', 'csv', 'html', 'png']
 * ```
 */
declare function getValidOutputFormatsFor(inputFormat: string): OutputFormat[];

export { ConversionOptions, ConversionResult, ILibreOfficeConverter, type ImageFormat, ImageOptions, InputFormat, LibreOfficeWasmOptions, OutputFormat, convertDocument, createConverter, exportAsImage, getValidOutputFormatsFor, isConversionSupported, isInputFormatSupported, isOutputFormatSupported };
