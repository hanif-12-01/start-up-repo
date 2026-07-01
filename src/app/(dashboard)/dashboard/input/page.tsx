import { ElectricityForm } from "@/components/forms/electricity-form";
import { PageHeader } from "@/components/ui/common";

export default function InputDataPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Input Data Listrik Usaha"
        subtitle="Isi data sederhana di bawah ini. WattWise AI akan memakai data ini untuk membuat analisis, prediksi tagihan, dan saran hemat."
      />
      <ElectricityForm />
    </div>
  );
}