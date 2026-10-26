/**
 * LibreOffice WASM Document Conversion Types
 * Headless document format conversion toolkit
 */
/**
 * Supported input document formats
 */
type InputFormat = 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'odt' | 'ods' | 'odp' | 'odg' | 'odf' | 'rtf' | 'txt' | 'html' | 'htm' | 'csv' | 'xml' | 'epub' | 'pdf';
/**
 * Supported output document formats
 */
type OutputFormat = 'pdf' | 'docx' | 'doc' | 'odt' | 'rtf' | 'txt' | 'html' | 'xlsx' | 'xls' | 'ods' | 'csv' | 'pptx' | 'ppt' | 'odp' | 'png' | 'svg';
/**
 * LibreOfficeKit saveAs filter options (JSON FilterData or legacy key=value).
 */
type FilterOptions = string;
/**
 * Document conversion options
 */
interface ConversionOptions {
    /**
     * Output format for the conversion
     */
    outputFormat: OutputFormat;
    /**
     * Input format hint (auto-detected if not provided)
     */
    inputFormat?: InputFormat;
    /**
     * PDF-specific options
     */
    pdf?: PdfOptions;
    /**
     * Image output options (for png and svg)
     */
    image?: ImageOptions;
    /**
     * Password for encrypted documents
     */
    password?: string;
    /**
     * Raw LibreOfficeKit filter options string.
     * When set, overrides options derived from format-specific fields like `pdf`.
     */
    filterOptions?: FilterOptions;
}
/**
 * PDF-specific conversion options
 */
interface PdfOptions {
    /**
     * PDF/A conformance level
     */
    pdfaLevel?: 'PDF/A-1b' | 'PDF/A-2b' | 'PDF/A-3b';
    /**
     * PDF quality (0-100, affects image compression)
     * @default 90
     */
    quality?: number;
}
/**
 * Image output options
 */
interface ImageOptions {
    /**
     * Image width in pixels
     */
    width?: number;
    /**
     * Image height in pixels
     */
    height?: number;
    /**
     * DPI for rendering
     * @default 150
     */
    dpi?: number;
    /**
     * Page index to export (0-based). Only exports this single page.
     * If not specified, exports the first page (page 0).
     */
    pageIndex?: number;
}
/**
 * Result of a document conversion
 */
interface ConversionResult {
    /**
     * The converted document data
     */
    data: Uint8Array;
    /**
     * MIME type of the output
     */
    mimeType: string;
    /**
     * Suggested filename with new extension
     */
    filename: string;
    /**
     * Conversion duration in milliseconds
     */
    duration: number;
}
/**
 * WASM loader module interface
 * This is the interface for the loader.cjs module that creates the Emscripten module
 */
interface WasmLoaderModule {
    createModule: (config: Record<string, unknown>) => Promise<EmscriptenModule>;
}
/**
 * LibreOffice WASM module initialization options (Node.js)
 */
interface LibreOfficeWasmOptions {
    /**
     * Path to WASM files directory
     * @default './wasm'
     */
    wasmPath?: string;
    /**
     * Path to the worker script (for WorkerConverter)
     * When not specified, auto-detected based on module location
     */
    workerPath?: string;
    /**
     * Pre-loaded WASM loader module
     * When provided, bypasses dynamic require of loader.cjs
     * This is useful for bundlers like Turbopack that can't handle dynamic requires
     *
     * @example
     * ```typescript
     * // In your code, import the loader statically
     * import * as wasmLoader from '@killbus/libreoffice-converter/wasm/loader.cjs';
     *
     * const converter = new LibreOfficeConverter({
     *   wasmPath: './wasm',
     *   wasmLoader,
     * });
     * ```
     */
    wasmLoader?: WasmLoaderModule;
    /**
     * Enable verbose logging
     * @default false
     */
    verbose?: boolean;
    /**
     * Called when WASM module is ready
     */
    onReady?: () => void;
    /**
     * Called on initialization error
     */
    onError?: (error: Error) => void;
    /**
     * Called with progress updates during initialization
     */
    onProgress?: (progress: ProgressInfo) => void;
    /**
     * Fonts to inject into the WASM virtual filesystem before LOK initialization.
     * These are written to /instdir/share/fonts/truetype/ so fontconfig discovers them.
     * Must be provided before initialize() is called.
     *
     * @example
     * ```typescript
     * const converter = new LibreOfficeConverter({
     *   fonts: [
     *     { filename: 'NotoSansCJK-Regular.ttc', data: fs.readFileSync('./fonts/NotoSansCJK-Regular.ttc') },
     *   ],
     * });
     * ```
     */
    fonts?: FontData[];
    /**
     * Automatically discover and load system-installed fonts (Node.js only).
     * Scans standard OS font directories:
     * - Linux: /usr/share/fonts, /usr/local/share/fonts, ~/.fonts
     * - macOS: /System/Library/Fonts, /Library/Fonts, ~/Library/Fonts
     * - Windows: C:\Windows\Fonts
     *
     * Loaded system fonts are merged with any explicitly provided `fonts` array.
     * Has no effect in browser environments.
     *
     * @default false
     */
    includeSystemFonts?: boolean;
}
/**
 * Font data for injection into the WASM virtual filesystem
 */
interface FontData {
    /** Font filename (e.g., 'NotoSansCJK-Regular.ttc') */
    filename: string;
    /** Raw font file data */
    data: Uint8Array | ArrayBuffer;
}
declare const FONT_PROFILE_SCHEMA_VERSION: 1;
declare const EMPTY_FONT_PROFILE_FINGERPRINT: "sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945";
interface FontProfileFont extends FontData {
    /** Optional caller claim. The Worker recomputes and verifies this SHA-256 digest. */
    sha256?: string;
}
/** Complete desired optional-font set for one atomic profile transition. */
interface FontProfileRequest {
    schemaVersion: typeof FONT_PROFILE_SCHEMA_VERSION;
    transitionId: string;
    expectedActiveFingerprint: string;
    targetFingerprint: string;
    fonts: FontProfileFont[];
}
type FontProfileResultCode = 'OK' | 'UNSUPPORTED' | 'FONT_PROFILE_BUSY' | 'STALE_ACTIVE_FINGERPRINT' | 'INVALID_PROFILE' | 'CACHE_CLOSE_FAILED' | 'NATIVE_ERROR';
type FontProfileStage = 'validate' | 'stage' | 'clear' | 'add' | 'remove' | 'replace' | 'refresh' | 'rollback' | 'commit' | 'cleanup';
interface FontProfileRuntimeIdentity {
    worker: string;
    module: string;
    lok: string;
}
interface FontProfileMutationDisposition {
    attempted: boolean;
    committed: boolean;
    stage: FontProfileStage;
}
interface FontProfileRollbackDisposition {
    attempted: boolean;
    succeeded: boolean | null;
}
interface FontProfileDiagnostics {
    activeFontCount: number;
    activeFontBytes: number;
    stagedFontCount: number;
    retiredFontCount: number;
    cleanupDebtPaths: string[];
    profileFileCount?: number;
    retainedFontPathCount?: number;
    retainedFontBytes?: number;
    wasmHeapBytes?: number;
    native?: NativeFontProfileDiagnostics;
    messages: string[];
}
interface FontProfileResult {
    schemaVersion: typeof FONT_PROFILE_SCHEMA_VERSION;
    transitionId: string;
    ok: boolean;
    code: FontProfileResultCode;
    expectedActiveFingerprint: string;
    targetFingerprint: string;
    activeFingerprint: string;
    appliedFingerprint: string;
    addedCount: number;
    removedCount: number;
    mutation: FontProfileMutationDisposition;
    rollback: FontProfileRollbackDisposition;
    stateKnown: boolean;
    runtimeReusable: boolean;
    quarantine: boolean;
    identity: FontProfileRuntimeIdentity;
    diagnostics: FontProfileDiagnostics;
}
interface NativeFontProfileManifestEntry {
    sha256: string;
    filename: string;
    path: string;
    url: string;
    byteLength: number;
}
interface NativeFontProfileRequest {
    schemaVersion: typeof FONT_PROFILE_SCHEMA_VERSION;
    transitionId: string;
    expectedActiveFingerprint: string;
    targetFingerprint: string;
    targetManifest: NativeFontProfileManifestEntry[];
    added: NativeFontProfileManifestEntry[];
    removed: NativeFontProfileManifestEntry[];
}
interface NativeFontProfileDiagnostics {
    activeFontCount: number;
    activeFontBytes: number;
    registryCountsAvailable: boolean;
    printFontManagerRecords: number;
    fontconfigApplicationPatterns: number;
    freetypeFontInfoRecords: number;
    freetypeFontFileRecords: number;
    message?: string;
}
interface NativeFontProfileResult {
    ok: boolean;
    code?: string;
    stage?: FontProfileStage;
    appliedFingerprint?: string;
    addedCount?: number;
    removedCount?: number;
    mutation?: Partial<FontProfileMutationDisposition>;
    rollback?: Partial<FontProfileRollbackDisposition>;
    stateKnown?: boolean;
    runtimeReusable?: boolean;
    diagnostics?: NativeFontProfileDiagnostics;
}
/** Required browser runtime files for the no-pthread profile. */
interface BrowserWasmCorePaths {
    /** URL to soffice.js - the main Emscripten loader script */
    sofficeJs: string;
    /** URL to soffice.wasm - the WebAssembly binary */
    sofficeWasm: string;
    /** URL to soffice.data - the virtual filesystem image */
    sofficeData: string;
}
/** Explicit paths to the no-pthread WASM runtime files. */
type BrowserWasmPaths = BrowserWasmCorePaths;
/**
 * Default URL for WASM files - relative path for same-origin hosting
 * Users typically serve WASM files from their own server at /wasm/
 */
declare const DEFAULT_WASM_BASE_URL = "/wasm/";
/**
 * Create WASM file paths from a base URL
 * Convenience helper for users who keep all WASM files in one directory
 *
 * @param baseUrl - Base URL ending with '/' (e.g., '/wasm/', 'https://cdn.example.com/wasm/')
 *                  Defaults to '/wasm/' for same-origin hosting
 * @returns Object with all WASM file paths
 *
 * @example
 * ```typescript
 * // Use default /wasm/ path (same-origin)
 * const converter = createWorkerBrowserConverter({
 *   ...createWasmPaths(),
 *   browserWorkerJs: '/dist/browser.worker.js',
 * });
 *
 * // Or use your own CDN
 * const converter = createWorkerBrowserConverter({
 *   ...createWasmPaths('https://cdn.example.com/wasm/'),
 *   browserWorkerJs: '/dist/browser.worker.js',
 * });
 * ```
 */
declare function createWasmPaths(baseUrl?: string): BrowserWasmPaths;
/**
 * Loading phases for WASM initialization
 * Used to track detailed progress during the ~80 second browser startup
 */
type WasmLoadPhase = 'download-wasm' | 'download-data' | 'compile' | 'filesystem' | 'lok-init' | 'ready' | 'starting' | 'loading' | 'initializing' | 'converting' | 'complete';
/**
 * Extended progress information with download details
 * Backward compatible - existing code using percent/message continues to work
 */
interface WasmLoadProgress {
    /** Overall progress 0-100 */
    percent: number;
    /** Human-readable status message */
    message: string;
    /** Current loading phase */
    phase: WasmLoadPhase;
    /** Bytes downloaded (present during download phases) */
    bytesLoaded?: number;
    /** Total bytes to download (present during download phases) */
    bytesTotal?: number;
}
/**
 * Progress information
 * @deprecated Use WasmLoadProgress for richer progress data
 */
interface ProgressInfo {
    phase: 'loading' | 'initializing' | 'converting' | 'complete';
    percent: number;
    message: string;
}
/**
 * Error codes for conversion failures
 */
declare enum ConversionErrorCode {
    UNKNOWN = "UNKNOWN",
    INVALID_INPUT = "INVALID_INPUT",
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
    CORRUPTED_DOCUMENT = "CORRUPTED_DOCUMENT",
    PASSWORD_REQUIRED = "PASSWORD_REQUIRED",
    WASM_NOT_INITIALIZED = "WASM_NOT_INITIALIZED",
    CONVERSION_FAILED = "CONVERSION_FAILED",
    LOAD_FAILED = "LOAD_FAILED"
}
/**
 * Custom error class for conversion errors
 */
declare class ConversionError extends Error {
    readonly code: ConversionErrorCode;
    readonly details?: string;
    constructor(code: ConversionErrorCode, message: string, details?: string);
}
/**
 * Emscripten Module interface
 */
interface EmscriptenModule {
    ccall: (name: string, returnType: string | null, argTypes: string[], args: unknown[]) => unknown;
    cwrap: (name: string, returnType: string | null, argTypes: string[]) => (...args: unknown[]) => unknown;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    HEAPU8: Uint8Array;
    HEAP32: Int32Array;
    HEAPU32: Uint32Array;
    FS: EmscriptenFS;
    noInitialRun?: boolean;
    onRuntimeInitialized?: () => void;
    calledRun?: boolean;
    _lok_preinit?: (path: number, args: number) => number;
    _lok_preinit_2?: (path: number, args: number, callback: number) => number;
    _libreofficekit_hook?: (path: number) => number;
    _libreofficekit_hook_2?: (path: number, userProfile: number) => number;
    _main?: (argc: number, argv: number) => number;
    _lok_convertDocument?: (kit: number, requestJson: number, resultSlot: number) => number;
    _lok_convertFree?: (allocation: number) => void;
    _lok_setFontProfile?: (kit: number, requestJson: number) => number;
    _lok_setFontProfileFree?: (allocation: number) => void;
    wasmTable?: WebAssembly.Table;
    locateFile?: (path: string) => string;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    ready?: Promise<EmscriptenModule>;
}
/**
 * Emscripten virtual filesystem
 */
interface EmscriptenFS {
    mkdir: (path: string) => void;
    writeFile: (path: string, data: Uint8Array | string, opts?: {
        encoding?: string;
    }) => void;
    readFile: (path: string, opts?: {
        encoding?: string;
    }) => Uint8Array | string;
    unlink: (path: string) => void;
    readdir: (path: string) => string[];
    stat: (path: string) => {
        size: number;
        isDirectory: () => boolean;
    };
    rmdir: (path: string) => void;
    rename: (oldPath: string, newPath: string) => void;
    open: (path: string, flags: unknown, mode?: unknown) => unknown;
}
/**
 * Filter name mapping for LibreOffice export
 * Note: For image exports, use getFilterForDocType() instead as filters are document-type specific
 */
declare const FORMAT_FILTERS: Record<OutputFormat, string>;
/**
 * MIME types for output formats
 */
declare const FORMAT_MIME_TYPES: Record<OutputFormat, string>;
/**
 * File extension to format mapping
 */
declare const EXTENSION_TO_FORMAT: Record<string, InputFormat>;
/**
 * Document type categories for determining valid conversions
 */
type DocumentCategory = 'text' | 'spreadsheet' | 'presentation' | 'drawing' | 'other';
/**
 * Map input formats to their document category
 * This determines which output formats are valid
 */
declare const INPUT_FORMAT_CATEGORY: Record<InputFormat, DocumentCategory>;
/**
 * Valid output formats for each document category
 * Based on LibreOffice's actual filter capabilities
 */
declare const CATEGORY_OUTPUT_FORMATS: Record<DocumentCategory, OutputFormat[]>;
/**
 * Get valid output formats for a given input format
 * @param inputFormat The input document format
 * @returns Array of valid output formats
 */
declare function getValidOutputFormats(inputFormat: InputFormat | string): OutputFormat[];
/**
 * Check if a conversion from input format to output format is valid
 * @param inputFormat The input document format
 * @param outputFormat The desired output format
 * @returns true if the conversion is supported
 */
declare function isConversionValid(inputFormat: InputFormat | string, outputFormat: OutputFormat | string): boolean;
/**
 * Get a human-readable error message for invalid conversions
 * @param inputFormat The input document format
 * @param outputFormat The desired output format
 * @returns Error message explaining why the conversion is not supported
 */
declare function getConversionErrorMessage(inputFormat: InputFormat | string, outputFormat: OutputFormat | string): string;
/**
 * Public conversion-only interface shared by all runtime owners.
 * Raw editor, rendering, callback, and view APIs are intentionally absent.
 */
interface ILibreOfficeConverter {
    /** Initialize the converter. Must be called before any other operations. */
    initialize(): Promise<void>;
    /** Destroy the converter and release all resources. */
    destroy(): Promise<void>;
    /** Check if the converter is ready for operations. */
    isReady(): boolean;
    /** Convert a document to a different format. */
    convert(input: Uint8Array | ArrayBuffer, options: ConversionOptions, filename?: string): Promise<ConversionResult>;
}
/** Conversion runtime that supports transactional dynamic optional-font profiles. */
interface IFontProfileConverter extends ILibreOfficeConverter {
    setFontProfile(profile: FontProfileRequest): Promise<FontProfileResult>;
}

/**
 * Font loading utilities for LibreOffice WASM (Node.js)
 *
 * Helpers to load font files from zip archives, directories,
 * npm packages, and system fonts for injection into the WASM virtual filesystem.
 */

/**
 * Load fonts from a zip file (Node.js).
 *
 * Reads a zip archive and extracts all font files (.ttf, .otf, .ttc)
 * as FontData entries ready for the `fonts` converter option.
 *
 * Requires `jszip` as an optional peer dependency.
 *
 * @param zipPath - Path to the zip file on disk
 * @returns Array of FontData entries
 *
 * @example
 * ```typescript
 * import { loadFontsFromZip, createSubprocessConverter } from '@killbus/libreoffice-converter';
 *
 * const fonts = await loadFontsFromZip('./fonts/libreoffice-fonts-cjk.zip');
 * const converter = await createSubprocessConverter({ fonts });
 * ```
 */
declare function loadFontsFromZip(zipPath: string): Promise<FontData[]>;
/**
 * Load fonts from a directory (Node.js).
 *
 * Reads all font files from a directory as FontData entries.
 *
 * @param dirPath - Path to directory containing font files
 * @returns Array of FontData entries
 *
 * @example
 * ```typescript
 * import { loadFontsFromDirectory, createSubprocessConverter } from '@killbus/libreoffice-converter';
 *
 * const fonts = await loadFontsFromDirectory('./my-fonts/');
 * const converter = await createSubprocessConverter({ fonts });
 * ```
 */
declare function loadFontsFromDirectory(dirPath: string): Promise<FontData[]>;
/**
 * Load all system-installed fonts for the current OS (Node.js only).
 *
 * Automatically detects the platform and recursively scans standard
 * system font directories for .ttf, .otf, .ttc, .woff, and .woff2 files.
 *
 * @returns Array of FontData entries from system font directories
 *
 * @example
 * ```typescript
 * import { loadSystemFonts, createSubprocessConverter } from '@killbus/libreoffice-converter';
 *
 * const fonts = await loadSystemFonts();
 * const converter = await createSubprocessConverter({ fonts });
 * ```
 */
declare function loadSystemFonts(): Promise<FontData[]>;
/**
 * Load fonts from an npm package's files/ directory (Node.js only).
 *
 * Resolves the package from node_modules and scans its `files/` subdirectory
 * for font files. Works with `@fontsource/*` packages and any package that
 * stores font files in a `files/` directory.
 *
 * @param packageName - npm package name (e.g., '@fontsource/noto-sans-jp')
 * @param options - Optional settings
 * @param options.formats - Font file extensions to include (default: all font types)
 * @returns Array of FontData entries
 *
 * @example
 * ```typescript
 * import { loadFontsFromPackage, createSubprocessConverter } from '@killbus/libreoffice-converter';
 *
 * // npm install @fontsource/noto-sans-jp
 * const fonts = await loadFontsFromPackage('@fontsource/noto-sans-jp');
 * const converter = await createSubprocessConverter({ fonts });
 * ```
 */
declare function loadFontsFromPackage(packageName: string, options?: {
    formats?: string[];
}): Promise<FontData[]>;
/**
 * Load fonts from multiple npm packages (Node.js only).
 *
 * Convenience wrapper around `loadFontsFromPackage` that loads from
 * multiple packages and deduplicates by filename.
 *
 * @param packageNames - Array of npm package names
 * @param options - Optional settings passed to loadFontsFromPackage
 * @returns Array of FontData entries
 *
 * @example
 * ```typescript
 * import { loadFontsFromPackages, createSubprocessConverter } from '@killbus/libreoffice-converter';
 *
 * const fonts = await loadFontsFromPackages([
 *   '@fontsource/noto-sans-jp',
 *   '@fontsource/noto-sans-kr',
 *   '@fontsource/noto-sans-sc',
 * ]);
 * const converter = await createSubprocessConverter({ fonts });
 * ```
 */
declare function loadFontsFromPackages(packageNames: string[], options?: {
    formats?: string[];
}): Promise<FontData[]>;

/**
 * Image encoding utilities for converting raw RGBA pixel data to image formats.
 * Uses sharp when available for high performance, falls back to pure JS implementation.
 */
/** Sharp function type for creating sharp instances */
type SharpFunction = (input: Buffer | Uint8Array, options?: {
    raw?: {
        width: number;
        height: number;
        channels: number;
    };
}) => SharpInstance;
/** Sharp instance with chained methods */
interface SharpInstance {
    png(options?: {
        compressionLevel?: number;
    }): SharpInstance;
    jpeg(options?: {
        quality?: number;
    }): SharpInstance;
    webp(options?: {
        quality?: number;
    }): SharpInstance;
    toBuffer(): Promise<Buffer>;
}
/**
 * Check if sharp is available
 */
declare function isSharpAvailable(): Promise<boolean>;
/**
 * Get the sharp module if available
 * @returns sharp function or null if not installed
 */
declare function getSharp(): Promise<SharpFunction | null>;
/**
 * Image format options for encoding
 */
interface ImageEncodeOptions {
    /** Output format */
    format: 'png' | 'jpeg' | 'webp';
    /** Quality for lossy formats (1-100), default 90 */
    quality?: number;
    /** Compression level for PNG (0-9), default 6 */
    compressionLevel?: number;
}
/**
 * Convert raw RGBA pixel data to an encoded image format.
 * Uses sharp when available for high performance, falls back to pure JS PNG encoder.
 *
 * @param rgbaData - Raw RGBA pixel data (4 bytes per pixel)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param options - Encoding options (format, quality)
 * @returns Encoded image data as Buffer
 *
 * @example
 * ```typescript
 * import { encodeImage } from '@killbus/libreoffice-converter';
 *
 * const preview = await converter.renderPage(docBuffer, 'docx', 0, 800);
 * const pngBuffer = await encodeImage(preview.data, preview.width, preview.height, { format: 'png' });
 * fs.writeFileSync('page.png', pngBuffer);
 * ```
 */
declare function encodeImage(rgbaData: Uint8Array, width: number, height: number, options?: ImageEncodeOptions): Promise<Buffer>;
/**
 * Convenience function to encode RGBA data to PNG
 * @param rgbaData - Raw RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @returns PNG encoded Buffer
 */
declare function rgbaToPng(rgbaData: Uint8Array, width: number, height: number): Promise<Buffer>;
/**
 * Convenience function to encode RGBA data to JPEG (requires sharp)
 * @param rgbaData - Raw RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @param quality - JPEG quality (1-100), default 90
 * @returns JPEG encoded Buffer
 */
declare function rgbaToJpeg(rgbaData: Uint8Array, width: number, height: number, quality?: number): Promise<Buffer>;
/**
 * Convenience function to encode RGBA data to WebP (requires sharp)
 * @param rgbaData - Raw RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @param quality - WebP quality (1-100), default 90
 * @returns WebP encoded Buffer
 */
declare function rgbaToWebp(rgbaData: Uint8Array, width: number, height: number, quality?: number): Promise<Buffer>;

export { type WasmLoadProgress as $, type NativeFontProfileRequest as A, type NativeFontProfileResult as B, type ConversionOptions as C, type FilterOptions as D, type ProgressInfo as E, type FontData as F, ConversionError as G, ConversionErrorCode as H, type ILibreOfficeConverter as I, EMPTY_FONT_PROFILE_FINGERPRINT as J, FONT_PROFILE_SCHEMA_VERSION as K, type LibreOfficeWasmOptions as L, FORMAT_FILTERS as M, type NativeFontProfileDiagnostics as N, type OutputFormat as O, type PdfOptions as P, FORMAT_MIME_TYPES as Q, EXTENSION_TO_FORMAT as R, getValidOutputFormats as S, isConversionValid as T, getConversionErrorMessage as U, INPUT_FORMAT_CATEGORY as V, CATEGORY_OUTPUT_FORMATS as W, createWasmPaths as X, DEFAULT_WASM_BASE_URL as Y, type DocumentCategory as Z, type WasmLoadPhase as _, type ConversionResult as a, type InputFormat as b, type ImageOptions as c, loadFontsFromDirectory as d, loadSystemFonts as e, loadFontsFromPackage as f, loadFontsFromPackages as g, encodeImage as h, rgbaToJpeg as i, rgbaToWebp as j, isSharpAvailable as k, loadFontsFromZip as l, getSharp as m, type ImageEncodeOptions as n, type FontProfileDiagnostics as o, type FontProfileFont as p, type FontProfileMutationDisposition as q, rgbaToPng as r, type FontProfileRequest as s, type FontProfileResult as t, type FontProfileResultCode as u, type FontProfileRollbackDisposition as v, type FontProfileRuntimeIdentity as w, type FontProfileStage as x, type IFontProfileConverter as y, type NativeFontProfileManifestEntry as z };
