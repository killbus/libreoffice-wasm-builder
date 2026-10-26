/**
 * Immutable package-relative browser asset deployment contract.
 *
 * Consumers choose public URLs and copy these files from the installed package.
 * The runtime is compiled without pthread support and has no internal worker asset.
 */
type LibreOfficeBrowserAssetKey = 'browserWorkerJs' | 'sofficeJs' | 'sofficeWasm' | 'sofficeData';
interface LibreOfficeBrowserAssetSpec {
    readonly key: LibreOfficeBrowserAssetKey;
    readonly packagePath: string;
    readonly outputName: string;
    readonly mimeType: string;
}
declare const LIBREOFFICE_BROWSER_ASSET_CONTRACT: Readonly<{
    readonly schemaVersion: 1;
    readonly packageName: "@killbus/libreoffice-converter";
    readonly threading: "none";
    readonly assets: Readonly<{
        browserWorkerJs: Readonly<{
            readonly key: "browserWorkerJs";
            readonly packagePath: "dist/browser.worker.global.js";
            readonly outputName: "browser.worker.global.js";
            readonly mimeType: "text/javascript";
        }>;
        sofficeJs: Readonly<{
            readonly key: "sofficeJs";
            readonly packagePath: "wasm/soffice.js";
            readonly outputName: "soffice.js";
            readonly mimeType: "text/javascript";
        }>;
        sofficeWasm: Readonly<{
            readonly key: "sofficeWasm";
            readonly packagePath: "wasm/soffice.wasm";
            readonly outputName: "soffice.wasm";
            readonly mimeType: "application/wasm";
        }>;
        sofficeData: Readonly<{
            readonly key: "sofficeData";
            readonly packagePath: "wasm/soffice.data";
            readonly outputName: "soffice.data";
            readonly mimeType: "application/octet-stream";
        }>;
    }>;
}>;
type LibreOfficeBrowserAssetContract = typeof LIBREOFFICE_BROWSER_ASSET_CONTRACT;

export { LIBREOFFICE_BROWSER_ASSET_CONTRACT, type LibreOfficeBrowserAssetContract, type LibreOfficeBrowserAssetKey, type LibreOfficeBrowserAssetSpec };
