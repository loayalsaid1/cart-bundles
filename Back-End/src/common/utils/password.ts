import argon2 from 'argon2';

// Recommended OWASP baseline settings for Argon2id
const options = {
  type: argon2.argon2id, // The safest variant against side-channel and GPU attacks
  memoryCost: 65536,     // 64 MB of RAM used per hash (adjust based on your server)
  timeCost: 3,           // Number of iterations (CPU cost)
  parallelism: 4         // Number of threads
} as const;

export async function hashPassword(plain: string): Promise<string> {
  // Returns a fully formatted string like: $argon2id$v=19$m=65536,t=3,p=4$...
  return argon2.hash(plain, options);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    // argon2 extracts the salt, memory, and time parameters directly from the stored string
    return await argon2.verify(stored, plain);
  } catch (err) {
    // Fails safely if the stored string is completely malformed or empty
    return false;
  }
}