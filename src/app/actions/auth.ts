"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

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

  try {
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return { error: "Email sudah terdaftar. Silakan login." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Register error:", error);
    return { error: "Terjadi kesalahan server. Coba lagi nanti." };
  }
}