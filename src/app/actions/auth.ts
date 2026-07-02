"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { safeError } from "@/lib/safe-log";
import { checkRateLimit, recordAuthAttempt } from "@/lib/rate-limit";

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Semua kolom wajib diisi" };
  }

  if (password.length < 6) {
    return { error: "Password minimal harus 6 karakter" };
  }

  const identifier = email.toLowerCase();

  try {
    // Rate limit register attempts
    const allowed = await checkRateLimit(identifier, "server-action", "register");
    if (!allowed) {
      return { error: "Terlalu banyak percobaan gagal. Coba lagi beberapa menit." };
    }

    const existingUser = await db.user.findUnique({
      where: { email: identifier },
    });

    if (existingUser) {
      return { error: "Email sudah terdaftar. Silakan login." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        name,
        email: identifier,
        password: hashedPassword,
      },
    });

    await recordAuthAttempt(identifier, "server-action", "register", true);
    return { success: true };
  } catch (error) {
    safeError("register", error);
    return { error: "Terjadi kesalahan server. Coba lagi nanti." };
  }
}