import JSZip from "jszip";
import type { FileData } from "src/FormatHandler";

/**
 * Triggers a browser download for a single file.
 */
export function downloadFile(bytes: Uint8Array, name: string, mime: string) {
	const blob = new Blob([bytes as BlobPart], { type: mime });
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = name;
	link.click();
}

/**
 * Ensures every entry in a set of output files has a unique name, so that
 * files sharing a name don't overwrite each other inside the archive.
 */
export function deduplicateNames(files: FileData[]): string[] {
	const used = new Set<string>();
	return files.map(file => {
		if (!used.has(file.name)) {
			used.add(file.name);
			return file.name;
		}
		const dot = file.name.lastIndexOf(".");
		const base = dot > 0 ? file.name.slice(0, dot) : file.name;
		const ext = dot > 0 ? file.name.slice(dot) : "";
		let index = 2;
		let candidate = `${base} (${index})${ext}`;
		while (used.has(candidate)) candidate = `${base} (${++index})${ext}`;
		used.add(candidate);
		return candidate;
	});
}

/**
 * Bundles output files into a single ZIP archive.
 */
export async function buildZip(files: FileData[]): Promise<Uint8Array> {
	const zip = new JSZip();
	const names = deduplicateNames(files);
	for (let i = 0; i < files.length; i ++) {
		zip.file(names[i], files[i].bytes);
	}
	// Most converted outputs are already compressed, so keep this cheap.
	return await zip.generateAsync({
		type: "uint8array",
		compression: "DEFLATE",
		compressionOptions: { level: 1 }
	});
}

/**
 * Downloads several output files as one archive. Browsers block bursts of
 * automatic downloads, so multiple outputs have to leave the page as one file.
 */
export async function downloadFilesAsZip(files: FileData[], archiveName: string) {
	downloadFile(await buildZip(files), archiveName, "application/zip");
}
