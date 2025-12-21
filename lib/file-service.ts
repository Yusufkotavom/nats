import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveFileToDisk(file: File): Promise<{ url: string; filename: string }> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  // Sanitize filename or just use UUID
  const ext = path.extname(file.name);
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await fs.writeFile(filepath, buffer);

  return {
    url: `/uploads/${filename}`,
    filename: filename,
  };
}

export async function deleteFileFromDisk(url: string) {
  // Extract filename from URL (assuming /uploads/filename.ext)
  const filename = url.split("/").pop();
  if (!filename) return;
  
  // Security check: ensure no directory traversal
  const filepath = path.join(UPLOAD_DIR, filename);
  
  // Ensure the resolved path is still within UPLOAD_DIR
  if (!filepath.startsWith(UPLOAD_DIR)) {
      console.error("Security warning: Attempted path traversal in deleteFileFromDisk");
      return;
  }

  try {
    await fs.unlink(filepath);
  } catch (error) {
    // Ignore error if file doesn't exist
    console.error("Error deleting file from disk:", error);
  }
}
