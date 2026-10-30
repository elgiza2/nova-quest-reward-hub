import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

const CustomCardForm = lazy(() => import("@/components/billing/CustomCardForm"));

export const Route = createFileRoute("/dev-pay")({
  head: () => ({ meta: [{ title: "Payment preview — Megsy" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ClientOnly>
      <Suspense fallback={null}>
        <div style={{ minHeight: "100dvh", background: "linear-gradient(#f4e9ef,#fff)" }}>
          <h1 style={{ padding: 24, fontSize: 28 }}>Pricing page behind</h1>
          <CustomCardForm open tier="pro" interval="monthly" onClose={() => {}} />
        </div>
      </Suspense>
    </ClientOnly>
  ),
});
