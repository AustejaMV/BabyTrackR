export async function checkPasswordBreach(password: string): Promise<boolean> {
  try {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });

    if (!response.ok) return false;

    const text = await response.text();
    const lines = text.split('\n');

    return lines.some((line) => {
      const [hash] = line.split(':');
      return hash.trim() === suffix;
    });
  } catch {
    return false;
  }
}
