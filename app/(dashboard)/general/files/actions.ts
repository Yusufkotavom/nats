"use server";

import { prisma } from "@/lib/prisma";
import { saveFileToDisk, deleteFileFromDisk } from "@/lib/file-service";
import { getSession } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

/**
 * Upload a file to local storage.
 *
 * @param formData - FormData containing the file
 * @returns        - Object containing success/error and file info
 */
export async function uploadFile(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  const file = formData.get("file") as File;

  if (!file) {
    return { error: "No file provided" };
  }

  const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "5242880"); // Default 5MB
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2);
    return { error: `File size exceeds the limit of ${sizeInMB}MB` };
  }

  try {
    const { url, filename } = await saveFileToDisk(file);

    const savedFile = await prisma.file.create({
      data: {
        name: file.name,
        url: url,
        mimeType: file.type,
        size: file.size,
        uploadedById: session.userId,
      },
    });

    revalidatePath("/general/files");
    return { success: true, file: savedFile };
  } catch (error) {
    console.error("Upload error:", error);
    return { error: "Failed to upload file" };
  }
}

/**
 * Delete a file from local storage and database.
 *
 * @param id - The ID of the file to delete
 * @returns  - Success flag or error
 */
export async function deleteFile(id: string) {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      return { error: "File not found" };
    }

    await deleteFileFromDisk(file.url);

    await prisma.file.delete({
      where: { id },
    });

    revalidatePath("/general/files");
    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { error: "Failed to delete file" };
  }
}

/**
 * Fetch all uploaded files.
 *
 * @returns - List of files with uploader info
 */
export async function getFiles() {
  const session = await getSession();
  if (!session) return [];

  return await prisma.file.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: {
        select: {
          name: true,
        },
      },
    },
  });
}
