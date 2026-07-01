"use server";

import { validateElectricityInput, type ElectricityInput } from "@/lib/validations/electricity";
import { processElectricitySubmission } from "@/services/electricity";

export async function submitElectricityDataAction(input: ElectricityInput) {
  const validated = validateElectricityInput(input);

  if (!validated.ok) {
    return {
      ok: false as const,
      error: "Data tidak valid.",
      validationErrors: validated.errors,
    };
  }

  const result = await processElectricitySubmission(validated.data);

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error,
    };
  }

  return {
    ok: true as const,
    data: result,
  };
}