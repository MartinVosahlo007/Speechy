export async function readTextAttachment(file: File): Promise<string> {
  return file.text();
}
