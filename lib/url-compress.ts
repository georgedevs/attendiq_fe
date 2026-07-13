// Helper to convert UUID string to Uint8Array (16 bytes)
function uuidToBytes(uuid: string): Uint8Array {
  const clean = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Helper to convert Uint8Array (16 bytes) back to UUID string
function bytesToUuid(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < 16; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Convert string/binary to base64url
function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Convert base64url back to Uint8Array
function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a Direct Link (Session UUID + Token UUID) into a single 45-character Base64Url code.
 */
export function encodeDirectLink(sessionId: string, token: string): string {
  const sessBytes = uuidToBytes(sessionId);
  const tokenBytes = uuidToBytes(token);
  const combined = new Uint8Array(33);
  combined[0] = 0; // Type 0 = Direct Link
  combined.set(sessBytes, 1);
  combined.set(tokenBytes, 17);
  return base64urlEncode(combined);
}

/**
 * Encodes a QR Code Link (Session UUID + 6-digit TOTP token) into a single 27-character Base64Url code.
 */
export function encodeQrLink(sessionId: string, totp: string): string {
  const sessBytes = uuidToBytes(sessionId);
  const codeInt = parseInt(totp, 10);
  const combined = new Uint8Array(20);
  combined[0] = 1; // Type 1 = QR Link
  combined.set(sessBytes, 1);
  
  // Encode 6-digit code as a 3-byte big-endian integer
  combined[17] = (codeInt >> 16) & 0xff;
  combined[18] = (codeInt >> 8) & 0xff;
  combined[19] = codeInt & 0xff;
  
  return base64urlEncode(combined);
}

export interface DecodedLink {
  type: 'direct' | 'qr';
  sessionId: string;
  token?: string; // Display token (UUID)
  totp?: string;  // 6-digit string
}

/**
 * Decodes a compressed base64url code back to its constituent UUIDs/TOTP values.
 */
export function decodeLinkCode(code: string): DecodedLink | null {
  try {
    const bytes = base64urlDecode(code);
    if (bytes.length < 17) return null;
    
    const typeByte = bytes[0];
    const sessionId = bytesToUuid(bytes.slice(1, 17));
    
    if (typeByte === 0 && bytes.length === 33) {
      const token = bytesToUuid(bytes.slice(17, 33));
      return { type: 'direct', sessionId, token };
    } else if (typeByte === 1 && bytes.length === 20) {
      const codeInt = (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
      const totp = String(codeInt).padStart(6, '0');
      return { type: 'qr', sessionId, totp };
    }
    return null;
  } catch {
    return null;
  }
}
