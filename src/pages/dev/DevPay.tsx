import CustomCardForm from "@/components/billing/CustomCardForm";
export default function DevPay() {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <h1 className="text-3xl font-bold">Pricing</h1>
      {Array.from({ length: 14 }, (_, i) => (
        <p key={i} className="mt-4 text-muted-foreground">Background content line {i + 1} — visible behind the sheet.</p>
      ))}
      <CustomCardForm open tier="pro" interval="monthly" onClose={() => {}} />
    </div>
  );
}
