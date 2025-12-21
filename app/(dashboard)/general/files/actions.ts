"use server";

import { prisma } from "@/lib/prisma";
import { saveFileToDisk, deleteFileFromDisk } from "@/lib/file-service";
import { getSession } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

export async function uploadFile(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  
  if (!file) {
    return { error: "No file provided" };
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

export async function getFiles() {
  const session = await getSession();
  if (!session) return [];
  
  return await prisma.file.findMany({
    orderBy: { createdAt: "desc" },
    include: {
        uploadedBy: {
            select: {
                name: true
            }
        }
    }
  });
}
