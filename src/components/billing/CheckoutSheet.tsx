/**
 * @doc Store-style payment sheet: product + price, the chosen method, one buy
 * button; tapping the method opens the saved-methods list. Card numbers are
 * never stored here — only the masked last digits the payment provider returns.
 */
import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, CreditCard, Loader2, Smartphone } from "lucide-react";
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
    "flex h-9 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-card";
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
    <div dir={ar ? "rtl" : "ltr"} className="fixed inset-0 z-[120] flex items-end justify-center bg-foreground/40 sm:items-center">
      <div className="absolute inset-0" onClick={busy ? undefined : onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={IOS_SPRING}
        className="relative w-full max-w-[440px] overflow-hidden rounded-t-[24px] bg-background text-foreground shadow-2xl sm:rounded-[24px]"
      >
        {list ? (
          <div className="pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            <div className="flex items-center gap-3 px-5 pb-3 pt-5">
              <button type="button" onClick={() => setList(false)} aria-label={t("Back", "رجوع")} className="rounded-full p-1.5 hover:bg-muted">
                <ArrowRight className="h-5 w-5 ltr:rotate-180" />
              </button>
              <h2 className="text-lg font-semibold">{t("Payment methods", "طرق الدفع")}</h2>
            </div>
            <ul className="divide-y divide-border/60">
              {options.map((m) => (
                <li key={m.kind === "saved" ? m.id : m.kind}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(m);
                      setList(false);
                    }}
                    className="flex w-full items-center gap-4 px-5 py-4 text-start hover:bg-muted/50"
                  >
                    <MethodIcon m={m} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15.5px] font-medium" dir="ltr">{label(m)}</span>
                      {m.kind === "saved" && (
                        <span className="text-[12.5px] text-muted-foreground">
                          {t("Saved · used for auto-renew", "محفوظة · للتجديد التلقائي")}
                        </span>
                      )}
                    </span>
                    {same(m, selected) && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 border-t border-border/60 px-5 pt-4">
              <p className="mb-2 text-[13px] text-muted-foreground">{t("Add a payment method", "إضافة طريقة دفع")}</p>
              <button
                type="button"
                onClick={() => {
                  onSelect({ kind: "new_card" });
                  setList(false);
                  onBuy();
                }}
                className="flex w-full items-center gap-4 rounded-xl py-3 text-start hover:bg-muted/50"
              >
                <CreditCard className="h-6 w-6" strokeWidth={1.7} />
                <span className="flex-1 text-[15.5px] font-medium">{t("Add a card", "إضافة بطاقة")}</span>
                <span className="flex items-center gap-1">
                  <BrandMark brand="mastercard" />
                  <BrandMark brand="visa" />
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="pb-[calc(env(safe-area-inset-bottom,0px)+18px)]">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
              <span className="text-[15px] font-semibold">Megsy AI</span>
              <button type="button" onClick={onClose} disabled={busy} className="text-[13px] text-muted-foreground hover:text-foreground">
                {t("Cancel", "إلغاء")}
              </button>
            </div>
            <div className="flex items-start gap-4 border-b border-border/60 px-5 py-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">M</span>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold leading-snug">{plan?.name ?? "Megsy"}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {interval === "yearly" ? t("Yearly · renews automatically", "سنوي · يتجدد تلقائيًا") : t("Monthly · renews automatically", "شهري · يتجدد تلقائيًا")}
                </p>
              </div>
              {price && <span className="text-[16px] font-semibold" dir="ltr">${price.price}</span>}
            </div>

            <button
              type="button"
              onClick={() => setList(true)}
              disabled={busy}
              className="flex w-full items-center gap-4 border-b border-border/60 bg-muted/40 px-5 py-4 text-start hover:bg-muted/60"
            >
              <MethodIcon m={selected} />
              <span className="min-w-0 flex-1 truncate text-[15.5px] font-medium" dir="ltr">{label(selected)}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
                <ChevronLeft className="h-4 w-4 ltr:rotate-180" />
              </span>
            </button>

            <div className="px-5 pt-4">
              {children}
              {note && <p role="status" className="mb-3 text-[13px] leading-relaxed text-destructive">{note}</p>}
              {selected.kind !== "apple_pay" && (
                <Button type="button" onClick={onBuy} disabled={busy} className="h-12 w-full rounded-full text-[15px] font-semibold">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : selected.kind === "new_card" ? t("Continue", "متابعة") : t("Subscribe", "اشترك الآن")}
                </Button>
              )}
              <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted-foreground">
                {t(
                  "Card details stay with the payment provider; Megsy only keeps the last 4 digits. Cancel auto-renew anytime.",
                  "بيانات البطاقة محفوظة عند بوابة الدفع، وMegsy بيحتفظ بآخر 4 أرقام بس. تقدر توقف التجديد في أي وقت.",
                )}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
