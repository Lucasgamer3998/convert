import { expect, test } from "bun:test";
import JSZip from "jszip";
import { buildZip, deduplicateNames } from "../src/ui/downloadFiles.ts";

const encoder = new TextEncoder();
const file = (name: string, body: string) => ({ name, bytes: encoder.encode(body) });

test("unique names are left alone", () => {
	expect(deduplicateNames([file("a.png", "1"), file("b.png", "2")]))
		.toEqual(["a.png", "b.png"]);
});

test("colliding names are suffixed instead of overwritten", () => {
	expect(deduplicateNames([file("a.png", "1"), file("a.png", "2"), file("a.png", "3")]))
		.toEqual(["a.png", "a (2).png", "a (3).png"]);
});

test("every output file survives the archive", async () => {
	const files = Array.from({ length: 30 }, (_, i) => file(`img${i}.png`, `contents ${i}`));
	const zip = await JSZip.loadAsync(await buildZip(files));
	const names = Object.keys(zip.files);

	expect(names.length).toBe(30);
	for (let i = 0; i < files.length; i ++) {
		expect(await zip.file(`img${i}.png`)!.async("string")).toBe(`contents ${i}`);
	}
});

test("files with identical names all survive the archive", async () => {
	const zip = await JSZip.loadAsync(await buildZip([
		file("photo.png", "first"),
		file("photo.png", "second")
	]));

	expect(Object.keys(zip.files).length).toBe(2);
	expect(await zip.file("photo.png")!.async("string")).toBe("first");
	expect(await zip.file("photo (2).png")!.async("string")).toBe("second");
});
