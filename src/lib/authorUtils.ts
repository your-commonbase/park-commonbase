export function parseAuthorInput(input: string): { name?: string; instagram?: string; url?: string } {
  const trimmed = input.trim()
  if (!trimmed) return {}

  // Check if input starts with @, indicating Instagram username
  if (trimmed.startsWith('@')) {
    const instagram = trimmed.slice(1) // Remove the @
    return {
      name: trimmed, // Keep the @ in the display name
      instagram: instagram,
      url: `https://instagram.com/${instagram}`
    }
  }

  // Otherwise, treat as regular name
  return {
    name: trimmed
  }
}