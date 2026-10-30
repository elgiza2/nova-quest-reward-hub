/**
 * @doc Store-style payment sheet: product + price, the chosen method, one buy
 * button; tapping the method opens the saved-methods list. Card numbers are
 * never stored here — only the masked last digits the payment provider returns.
 */
import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, CreditCard, Loader2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./CardPreview";
import { getDisplayPrice, getPlan, type PlanTier } from "@/data/pricingData";
import { useUserLang } from "@/lib/authI18n";
import { IOS_SPRING } from "@/pages/chat/constants/motion";

export type SheetMethod =
  | { kind: "saved"; id: string; brand: "visa" | "mastercard" | "card"; last4: string }
  | { kind: "vodafone" }
  | { kind: "apple_pay" }
  | { kind: "new_card" };

type Props = {
  tier: PlanTier;
  interval: "monthly" | "yearly";
  savedCards: Array<Extract<SheetMethod, { kind: "saved" }>>;
  showVodafone: boolean;
  showApplePay: boolean;
  selected: SheetMethod;
  onSelect: (m: SheetMethod) => void;
  onBuy: () => void;
  onClose: () => void;
  busy?: boolean;
  note?: string | null;
  children?: React.ReactNode;
};

export function lastFour(masked: string | null | undefined): string | null {
  const digits = (masked ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function brandOf(masked: string | null | undefined): "visa" | "mastercard" | "card" {
  const d = (masked ?? "").replace(/\D/g, "");
  if (d.startsWith("4")) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  return "card";
}

function MethodIcon({ m }: { m: SheetMethod }) {
  const box =
    "play-method-icon";
  if (m.kind === "saved" && m.brand !== "card")
    return (
      <span className={box}>
        <BrandMark brand={m.brand} />
      </span>
    );
  if (m.kind === "vodafone")
    return (
      <span className={box}>
        <Smartphone className="h-5 w-5 text-destructive" strokeWidth={1.8} />
      </span>
    );
  if (m.kind === "apple_pay")
    return <span className={`${box} text-[11px] font-semibold text-foreground`}>Pay</span>;
  return (
    <span className={box}>
      <CreditCard className="h-5 w-5 text-foreground/70" strokeWidth={1.7} />
    </span>
  );
}

export default function CheckoutSheet(props: Props) {
  const { tier, interval, savedCards, showVodafone, showApplePay, selected, onSelect, onBuy, onClose, busy, note, children } =
    props;
  const ar = useUserLang().startsWith("ar");
  const t = (en: string, a: string) => (ar ? a : en);
  const [list, setList] = useState(false);
  const plan = getPlan(tier);
  const price = plan ? getDisplayPrice(plan, interval === "yearly") : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const label = (m: SheetMethod) =>
    m.kind === "saved"
      ? `${m.brand === "visa" ? "Visa" : m.brand === "mastercard" ? "Mastercard" : t("Card", "بطاقة")} •••• ${m.last4}`
      : m.kind === "vodafone"
        ? t("Vodafone Cash", "فودافون كاش")
        : m.kind === "apple_pay"
          ? "Apple Pay"
          : t("Add a card", "إضافة بطاقة");

  const same = (a: SheetMethod, b: SheetMethod) =>
    a.kind === b.kind && (a.kind !== "saved" || (b.kind === "saved" && a.id === b.id));

  const options: SheetMethod[] = [
    ...savedCards,
    ...(showVodafone ? [{ kind: "vodafone" } as const] : []),
    ...(showApplePay ? [{ kind: "apple_pay" } as const] : []),
  ];

  return (
    <div dir={ar ? "rtl" : "ltr"} className="play-checkout-overlay">
      <div className="absolute inset-0" onClick={busy ? undefined : onClose} />
      <motion.div role="dialog" aria-modal="true" aria-label={t("Checkout", "الدفع")}
        initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={IOS_SPRING}
        className="play-checkout">
        {list ? (
          <div className="pb-6">
            <div className="play-checkout-heading">
              <Button variant="ghost" className="play-back" onClick={() => setList(false)} aria-label={t("Back", "رجوع")}><ArrowRight className="h-5 w-5 ltr:rotate-180" /></Button>
              <h2>{t("Payment methods", "طرق الدفع")}</h2>
            </div>
            <ul>
              {options.map((m) => (
                <li key={m.kind === "saved" ? m.id : m.kind}>
                  <Button variant="ghost" className="play-method-row" onClick={() => { onSelect(m); setList(false); }}>
                    <MethodIcon m={m} />
                    <span className="play-method-label" dir="auto">{label(m)}</span>
                    {same(m, selected) && <span className="play-method-check"><Check className="h-4 w-4" strokeWidth={3} /></span>}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="play-checkout-add">
              <p>{t("Add a payment method to your account", "إضافة طريقة دفع إلى حسابك")}</p>
              <Button variant="ghost" className="play-method-row" onClick={() => { onSelect({ kind: "new_card" }); setList(false); onBuy(); }}>
                <CreditCard className="h-6 w-6" />
                <span className="play-method-label">{t("Add card", "إضافة بطاقة")}</span>
                <span className="flex items-center gap-2"><BrandMark brand="mastercard" /><BrandMark brand="visa" /></span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="play-checkout-brand flex items-center justify-between">
              <span>Megsy AI</span>
              <Button variant="ghost" className="play-back" onClick={onClose} disabled={busy} aria-label={t("Close", "إغلاق")}><X className="h-4 w-4" /></Button>
            </div>
            <div className="play-checkout-product">
              <span className="play-product-icon" aria-hidden="true">M</span>
              <div className="min-w-0 flex-1">
                <h2>Megsy AI · {plan?.name ?? "Megsy"}</h2>
                <p>{interval === "yearly" ? t("Yearly subscription", "اشتراك سنوي") : t("Monthly subscription", "اشتراك شهري")}</p>
              </div>
              {price && <span className="play-checkout-price" dir="ltr">${price.price}</span>}
            </div>
            <Button variant="ghost" className="play-method-row play-method-selected" onClick={() => setList(true)} disabled={busy}>
              <MethodIcon m={selected} />
              <span className="play-method-label" dir="auto">{label(selected)}</span>
              <span className="play-method-arrow"><ChevronLeft className="h-4 w-4 ltr:rotate-180" /></span>
            </Button>
            <div className="play-checkout-footer">
              {children}
              {note && <p role="status" className="text-destructive">{note}</p>}
              <p>{t("Continue to confirm your subscription securely with the payment provider.", "تابع لتأكيد اشتراكك بأمان من خلال بوابة الدفع.")}</p>
              {selected.kind !== "apple_pay" && <Button variant="ghost" className="play-buy" onClick={onBuy} disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : selected.kind === "new_card" ? t("Continue", "متابعة") : t("Tap to subscribe", "انقر للاشتراك")}
              </Button>}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
