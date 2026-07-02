import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import InvoiceClient from "./invoice-client";
import { PageHeader } from "@/components/ui/common";

export const metadata = {
  title: "Detail Invoice - WattWise AI",
  description: "Rincian tagihan pembayaran WattWise AI.",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: { paymentId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  const userId = (session.user as any).id;

  const payment = await db.payment.findUnique({
    where: { id: params.paymentId },
  });

  if (!payment || payment.userId !== userId) {
    notFound();
  }

  // Get plan details
  const plan = await db.plan.findUnique({
    where: { code: payment.planCode },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageHeader
        title="Detail Invoice"
        subtitle="Selesaikan pembayaran Anda menggunakan simulasi Virtual Account."
      />
      <InvoiceClient payment={payment} planName={plan?.name || payment.planCode} />
    </div>
  );
}
