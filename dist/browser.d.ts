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
 * Browser converter initialization options
 * All WASM paths are optional and default to /wasm/ via createWasmPaths()
 */
interface BrowserConverterOptions {
    /** URL to soffice.js - defaults to /wasm/soffice.js */
    sofficeJs?: string;
    /** URL to soffice.wasm - defaults to /wasm/soffice.wasm */
    sofficeWasm?: string;
    /** URL to soffice.data - defaults to /wasm/soffice.data */
    sofficeData?: string;
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
    onProgress?: (progress: WasmLoadProgress) => void;
    /**
     * Fonts to inject into the WASM virtual filesystem before LOK initialization.
     * Font data is transferred to the Web Worker and written before fontconfig scans.
     */
    fonts?: FontData[];
}
/**
 * Worker browser converter initialization options
 * All WASM paths are optional and default to /wasm/ via createWasmPaths()
 */
interface WorkerBrowserConverterOptions extends BrowserConverterOptions {
    /** URL to browser.worker.js - defaults to /dist/browser.worker.global.js */
    browserWorkerJs?: string;
    /**
     * Enable download progress tracking during WASM initialization
     * When enabled, intercepts fetch/XHR to track download progress for soffice.wasm and soffice.data
     *
     * **WARNING**: This is disabled by default because the fetch interceptor can break
     * WebAssembly streaming compilation in some environments. Only enable if you need
     * detailed download progress and have tested it works in your target browsers.
     *
     * @default false
     */
    enableProgressTracking?: boolean;
}
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
 * Font loading utilities for LibreOffice WASM (Browser)
 *
 * Browser-compatible helper to load font files from zip archives
 * served over HTTP for injection into the WASM virtual filesystem.
 */

/**
 * Load fonts from a zip file URL (Browser).
 *
 * Fetches a zip archive from a URL and extracts all font files
 * as FontData entries ready for the `fonts` converter option.
 *
 * Requires `jszip` as an optional peer dependency.
 *
 * @param url - URL to the font zip file
 * @returns Array of FontData entries
 *
 * @example
 * ```typescript
 * import { loadFontsFromUrl, WorkerBrowserConverter } from '@killbus/libreoffice-converter/browser';
 *
 * const fonts = await loadFontsFromUrl('/fonts/libreoffice-fonts-cjk.zip');
 * const converter = new WorkerBrowserConverter({ fonts });
 * await converter.initialize();
 * ```
 */
declare function loadFontsFromUrl(url: string): Promise<FontData[]>;

/**
 * LibreOffice WASM Document Converter - Browser Module
 *
 * Browser-optimized module with utilities for file handling,
 * drag-and-drop, and downloads.
 *
 * @packageDocumentation
 */

declare const LIBREOFFICE_BROWSER_CAPABILITIES: Readonly<{
    dynamicFontProfiles: 1;
}>;

/** Create an uninitialized main-thread conversion-only browser facade. */
declare function createBrowserConverter(options?: BrowserConverterOptions): ILibreOfficeConverter;
/** Create an uninitialized Worker-owned conversion-only browser facade. */
declare function createWorkerBrowserConverter(options?: WorkerBrowserConverterOptions): IFontProfileConverter;
/**
 * Create drop zone for file conversion
 */
declare function createDropZone(element: HTMLElement | string, options: BrowserWasmPaths & {
    outputFormat: OutputFormat;
    onConvert?: (result: ConversionResult) => void;
    onError?: (error: Error) => void;
    onProgress?: (progress: {
        percent: number;
        message: string;
    }) => void;
    autoDownload?: boolean;
}): {
    destroy: () => void;
};
/**
 * Quick convert with auto-download
 */
declare function quickConvert(file: File, outputFormat: OutputFormat, options: BrowserWasmPaths & {
    download?: boolean;
}): Promise<ConversionResult>;

export { type BrowserConverterOptions, type BrowserWasmPaths, ConversionError, ConversionErrorCode, type ConversionOptions, type ConversionResult, DEFAULT_WASM_BASE_URL, EMPTY_FONT_PROFILE_FINGERPRINT, EXTENSION_TO_FORMAT, FONT_PROFILE_SCHEMA_VERSION, FORMAT_FILTERS, FORMAT_MIME_TYPES, type FilterOptions, type FontData, type FontProfileRequest, type FontProfileResult, type IFontProfileConverter, type ILibreOfficeConverter, type ImageOptions, type InputFormat, LIBREOFFICE_BROWSER_CAPABILITIES, type LibreOfficeWasmOptions, type OutputFormat, type PdfOptions, type ProgressInfo, type WasmLoadPhase, type WasmLoadProgress, type WorkerBrowserConverterOptions, createBrowserConverter, createDropZone, createWasmPaths, createWorkerBrowserConverter, loadFontsFromUrl, quickConvert };
