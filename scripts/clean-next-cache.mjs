import fs from "fs";
import path from "path";

const nextDir = path.join(process.cwd(), ".next");

if (fs.existsSync(nextDir)) {
  console.log(`[Clean Cache] Menghapus folder cache .next di: ${nextDir}`);
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("[Clean Cache] Berhasil menghapus cache .next.");
  } catch (error) {
    console.error("[Clean Cache] Gagal menghapus cache .next:", error.message);
  }
} else {
  console.log("[Clean Cache] Folder cache .next tidak ditemukan, lanjut menjalankan server.");
}
