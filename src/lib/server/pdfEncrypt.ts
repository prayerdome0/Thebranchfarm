import { createHash } from "node:crypto";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFString,
} from "pdf-lib";

/**
 * PDF standard security handler (encryption) for the admin user guide.
 *
 * Implements the classic RC4 128-bit handler (V=2, R=3) from the PDF
 * specification: the document can only be opened with the administrator-
 * controlled password, which lives ONLY in the server environment
 * (GUIDE_PDF_PASSWORD). It is never shown in the UI, never shipped to the
 * browser and never written into client code.
 *
 * Access control note: encryption is a second layer. The first layer is the
 * admin-authenticated /api/guide route itself — the PDF is generated on the
 * fly and is never stored in a public folder.
 */

const PAD = Buffer.from([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

const KEY_LENGTH_BYTES = 16; // 128-bit

function md5(input: Buffer): Buffer {
  return createHash("md5").update(input).digest();
}

function rc4(key: Buffer, data: Buffer): Buffer {
  const s = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + s[i] + key[i % key.length]) % 256;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const out = Buffer.alloc(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k += 1) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    [s[i], s[j]] = [s[j], s[i]];
    out[k] = data[k] ^ s[(s[i] + s[j]) % 256];
  }
  return out;
}

function padPassword(password: string): Buffer {
  const bytes = Buffer.from(password, "latin1").subarray(0, 32);
  return Buffer.concat([bytes, PAD]).subarray(0, 32);
}

function xorKey(key: Buffer, value: number): Buffer {
  const out = Buffer.from(key);
  for (let i = 0; i < out.length; i += 1) out[i] ^= value;
  return out;
}

function int32le(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32LE(value | 0, 0);
  return buffer;
}

/** Algorithm 3.3 — the /O (owner) entry. */
function computeOwnerEntry(userPassword: string, ownerPassword: string): Buffer {
  let digest = md5(padPassword(ownerPassword));
  for (let i = 0; i < 50; i += 1) digest = md5(digest.subarray(0, KEY_LENGTH_BYTES));
  const key = digest.subarray(0, KEY_LENGTH_BYTES);
  let value = rc4(key, padPassword(userPassword));
  for (let i = 1; i <= 19; i += 1) value = rc4(xorKey(key, i), value);
  return value;
}

/** Algorithm 3.2 — the file (encryption) key. */
function computeFileKey(userPassword: string, ownerEntry: Buffer, permissions: number, id: Buffer): Buffer {
  let digest = md5(Buffer.concat([padPassword(userPassword), ownerEntry, int32le(permissions), id]));
  for (let i = 0; i < 50; i += 1) digest = md5(digest.subarray(0, KEY_LENGTH_BYTES));
  return Buffer.from(digest.subarray(0, KEY_LENGTH_BYTES));
}

/** Algorithm 3.5 — the /U (user) entry for revision 3. */
function computeUserEntry(fileKey: Buffer, id: Buffer): Buffer {
  let value = rc4(fileKey, md5(Buffer.concat([PAD, id])));
  for (let i = 1; i <= 19; i += 1) value = rc4(xorKey(fileKey, i), value);
  return Buffer.concat([value, Buffer.alloc(16, 0xbf)]);
}

/** Per-object key (Algorithm 3.1). */
function objectKey(fileKey: Buffer, ref: PDFRef): Buffer {
  const number = Buffer.from([ref.objectNumber & 0xff, (ref.objectNumber >> 8) & 0xff, (ref.objectNumber >> 16) & 0xff]);
  const generation = Buffer.from([ref.generationNumber & 0xff, (ref.generationNumber >> 8) & 0xff]);
  return md5(Buffer.concat([fileKey, number, generation])).subarray(0, Math.min(fileKey.length + 5, 16));
}

function isIndirectContainer(value: unknown): value is PDFDict | PDFArray {
  return value instanceof PDFDict || value instanceof PDFArray;
}

function encryptStringsIn(container: PDFDict | PDFArray, key: Buffer) {
  const encryptValue = (value: unknown): unknown => {
    if (value instanceof PDFString || value instanceof PDFHexString) {
      return PDFHexString.of(rc4(key, Buffer.from(value.asBytes())).toString("hex"));
    }
    if (isIndirectContainer(value)) {
      encryptStringsIn(value, key);
    }
    return undefined;
  };

  if (container instanceof PDFDict) {
    for (const [name, value] of container.entries()) {
      const replacement = encryptValue(value);
      if (replacement !== undefined) container.set(name, replacement as PDFString | PDFHexString);
    }
  } else {
    for (let index = 0; index < container.size(); index += 1) {
      const replacement = encryptValue(container.get(index));
      if (replacement !== undefined) container.set(index, replacement as PDFString | PDFHexString);
    }
  }
}

/**
 * Encrypts a PDF produced by pdf-lib with the standard security handler
 * (RC4, 128-bit, revision 3). Both the open (user) password and the owner
 * password are the administrator-controlled password.
 */
export async function encryptPdfRc4(pdfBytes: Uint8Array, password: string): Promise<Uint8Array> {
  const permissions = -1; // once opened, everything is permitted — the password gate is the protection
  const doc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
    throwOnInvalidObject: false,
  });
  const context = doc.context;

  const id0 = md5(Buffer.concat([Buffer.from(`guide:${Date.now()}`), Buffer.from(String(pdfBytes.length))]));
  const id1 = md5(Buffer.concat([id0, Buffer.from(password, "latin1")]));

  const ownerEntry = computeOwnerEntry(password, password);
  const fileKey = computeFileKey(password, ownerEntry, permissions, id0);
  const userEntry = computeUserEntry(fileKey, id0);

  const encryptDict = context.obj({
    Filter: "Standard",
    V: 2,
    R: 3,
    Length: 128,
    P: permissions,
    StmF: "StdCF",
    StrF: "StdCF",
  }) as PDFDict;
  encryptDict.set(PDFName.of("O"), PDFHexString.of(ownerEntry.toString("hex")));
  encryptDict.set(PDFName.of("U"), PDFHexString.of(userEntry.toString("hex")));

  const encryptRef = context.register(encryptDict);

  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (ref === encryptRef) continue;
    const key = objectKey(fileKey, ref);

    if (object instanceof PDFRawStream) {
      // RC4 is length-preserving, so the stream /Length stays valid.
      const cipher = rc4(key, Buffer.from(object.contents));
      const replacement = PDFRawStream.of(object.dict, new Uint8Array(cipher));
      encryptStringsIn(replacement.dict, key);
      context.assign(ref, replacement);
    } else if (isIndirectContainer(object)) {
      encryptStringsIn(object, key);
    }
  }

  context.trailerInfo.Encrypt = encryptRef;
  context.trailerInfo.ID = context.obj([
    PDFHexString.of(id0.toString("hex")),
    PDFHexString.of(id1.toString("hex")),
  ]) as PDFArray;

  return doc.save({ useObjectStreams: false });
}

/** Small helper so callers can show the right size without decoding. */
export function guidePasswordConfigured(): boolean {
  return Boolean((process.env.GUIDE_PDF_PASSWORD || "").trim());
}
