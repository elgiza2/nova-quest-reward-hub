/**
 * @doc Floating payment sheet (shadcn-style, black & white): plan + price, method tabs
 * (card / wallet / other) with radio cards, and one buy button. Card numbers are never
 * stored here — only the masked last digits the payment provider returns.
 * Provider names are never shown to customers.
 */
import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { Check, CreditCard, Globe2, Loader2, Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./CardPreview";
import { BRAND_MARKS, type BrandSlug } from "@/lib/payments/brandMarks";
import { getDisplayPrice, getPlan, type PlanTier } from "@/data/pricingData";
import { useUserLang } from "@/lib/authI18n";
import { IOS_SPRING } from "@/pages/chat/constants/motion";

export type GlobalMethodId = "apple_pay" | "google_pay" | "more";

export type SheetMethod =
  | { kind: "saved"; id: string; brand: "visa" | "mastercard" | "card"; last4: string }
  | { kind: "vodafone" }
  | { kind: "global"; id: GlobalMethodId }
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

function Simple({ slug, className = "h-5 w-5" }: { slug: BrandSlug; className?: string }) {
  const b = BRAND_MARKS[slug];
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={b.title}>
      <path d={b.path} fill={`#${b.hex}`} />
    </svg>
  );
}

function VodafoneMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" role="img" aria-label="Vodafone Cash">
      <circle cx="12" cy="12" r="11" className="payment-red" />
      <path d="M13.4 5.6c-2.9.4-5.3 2.9-5.3 6.2 0 3 2.2 5.6 5 5.6 2.5 0 4.4-1.9 4.4-4.4 0-2.6-1.9-3.7-3.9-4.3 0-1.1.2-2.3-.2-3.1Z" className="payment-white" />
    </svg>
  );
}

function MethodIcon({ m }: { m: SheetMethod }) {
  let inner: React.ReactNode = <CreditCard className="h-4 w-4" strokeWidth={1.8} />;
  if (m.kind === "new_card") inner = <Plus className="h-4 w-4" strokeWidth={2.2} />;
  else if (m.kind === "saved" && m.brand !== "card") inner = <BrandMark brand={m.brand} />;
  else if (m.kind === "vodafone") inner = <VodafoneMark />;
  else if (m.kind === "global" && m.id === "apple_pay") inner = <Simple slug="applepay" className="h-7 w-7" />;
  else if (m.kind === "global" && m.id === "google_pay") inner = <Simple slug="googlepay" className="h-7 w-7" />;
  else if (m.kind === "global") inner = <Globe2 className="h-4 w-4" strokeWidth={1.8} />;
  return <span className="pay-badge">{inner}</span>;
}

/** Live card preview shown while typing a new card. */
export function CardVisual({ number, name, expiry }: { number: string; name: string; expiry: string }) {
  const d = number.replace(/\D/g, "");
  const brand = brandOf(d);
  const shown = (d + "•".repeat(Math.max(0, 16 - d.length))).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  return (
    <div className="pay-card-visual" dir="ltr" aria-hidden="true">
      <span className="pay-points">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</span>
      <div className="pay-card-top">
        <span className="pay-chip" />
        <span className="pay-card-brand">{brand === "card" ? <CreditCard className="h-5 w-5" /> : <BrandMark brand={brand} />}</span>
      </div>
      <div className="pay-card-number">{shown}</div>
      <div className="pay-card-bottom">
        <div><small>Card holder</small><span>{name.trim() || "YOUR NAME"}</span></div>
        <div><small>Expires</small><span>{expiry || "MM / YY"}</span></div>
      </div>
    </div>
  );
}

type Tab = "card" | "wallet" | "other";
const tabOf = (m: SheetMethod): Tab =>
  m.kind === "saved" || m.kind === "new_card" ? "card" : m.kind === "vodafone" || m.id !== "more" ? "wallet" : "other";

export default function CheckoutSheet(props: Props) {
  const { tier, interval, savedCards, showVodafone, showApplePay, selected, onSelect, onBuy, onClose, busy, note, children } =
    props;
  const ar = useUserLang().startsWith("ar");
  const t = (en: string, a: string) => (ar ? a : en);
  const plan = getPlan(tier);
  const price = plan ? getDisplayPrice(plan, interval === "yearly") : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const label = (m: SheetMethod) =>
    m.kind === "saved"
      ? `${m.brand === "visa" ? "Visa" : m.brand === "mastercard" ? "Mastercard" : t("Card", "بطاقة")} •••• ${m.last4}`
      : m.kind === "vodafone"
        ? t("Vodafone Cash", "فودافون كاش")
        : m.kind === "global"
          ? m.id === "apple_pay"
            ? "Apple Pay"
            : m.id === "google_pay"
              ? "Google Pay"
              : t("More methods", "طرق دفع أخرى")
          : t("New card", "بطاقة جديدة");

  const sub = (m: SheetMethod) =>
    m.kind === "saved"
      ? t("Saved · renews automatically", "محفوظة · تجديد تلقائي")
      : m.kind === "new_card"
        ? t("Visa or Mastercard", "فيزا أو ماستركارد")
        : m.kind === "vodafone"
          ? t("Approve on your phone", "وافق من موبايلك")
          : m.kind === "global" && m.id === "more"
            ? t("PayPal, Klarna, local banks", "PayPal و Klarna وبنوك محلية")
            : t("Fast secure checkout", "دفع سريع وآمن");

  const same = (a: SheetMethod, b: SheetMethod) =>
    a.kind === b.kind &&
    (a.kind !== "saved" || (b.kind === "saved" && a.id === b.id)) &&
    (a.kind !== "global" || (b.kind === "global" && a.id === b.id));

  const lists: Record<Tab, SheetMethod[]> = {
    card: [...savedCards, { kind: "new_card" }],
    wallet: [
      ...(showVodafone ? [{ kind: "vodafone" } as const] : []),
      ...(showApplePay ? [{ kind: "global", id: "apple_pay" } as const] : []),
      { kind: "global", id: "google_pay" } as const,
    ],
    other: [{ kind: "global", id: "more" }],
  };
  const [tab, setTab] = useState<Tab>(tabOf(selected));
  const pickTab = (x: Tab) => {
    setTab(x);
    if (tabOf(selected) !== x) onSelect(lists[x][0]);
  };
  const key = (m: SheetMethod) => (m.kind === "saved" ? m.id : m.kind === "global" ? m.id : m.kind);
  const tabs: Array<[Tab, string]> = [
    ["card", t("Card", "بطاقة")],
    ["wallet", t("Wallet", "محفظة")],
    ["other", t("Other", "أخرى")],
  ];

  return (
    <div dir={ar ? "rtl" : "ltr"} className="play-checkout-overlay">
      <div className="absolute inset-0" onClick={busy ? undefined : onClose} />
      <motion.div role="dialog" aria-modal="true" aria-label={t("Checkout", "الدفع")}
        initial={{ y: 28, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={IOS_SPRING}
        className="play-checkout">
        <header className="pay-head">
          <span className="pay-logo" aria-hidden="true">M</span>
          <div className="min-w-0 flex-1">
            <h2>{plan?.name ?? "Megsy"}</h2>
            <p>{interval === "yearly" ? t("Yearly · renews automatically", "سنوي · يتجدد تلقائياً") : t("Monthly · renews automatically", "شهري · يتجدد تلقائياً")}</p>
          </div>
          <Button variant="ghost" className="play-back" onClick={onClose} disabled={busy} aria-label={t("Close", "إغلاق")}><X className="h-4 w-4" /></Button>
        </header>

        {price && (
          <div className="pay-price" dir="ltr">
            <strong>${price.price}</strong>
            <span>/ {interval === "yearly" ? t("year", "سنة") : t("month", "شهر")}</span>
          </div>
        )}

        <div className="pay-tabs" role="tablist">
          {tabs.map(([id, name]) => (
            <Button key={id} variant="ghost" role="tab" aria-selected={tab === id} data-on={tab === id || undefined}
              className="pay-tab" onClick={() => pickTab(id)} disabled={busy}>{name}</Button>
          ))}
        </div>

        <div className="pay-options" role="radiogroup">
          {lists[tab].map((m) => {
            const on = same(m, selected);
            return (
              <Button key={key(m)} variant="ghost" role="radio" aria-checked={on} data-on={on || undefined}
                className="pay-option" onClick={() => onSelect(m)} disabled={busy}>
                <MethodIcon m={m} />
                <span className="pay-option-label" dir="auto">{label(m)}<small>{sub(m)}</small></span>
                {m.kind === "new_card" && <span className="pay-mini-brands"><BrandMark brand="visa" /><BrandMark brand="mastercard" /></span>}
                <span className="pay-radio">{on && <Check className="h-3 w-3" strokeWidth={3.2} />}</span>
              </Button>
            );
          })}
        </div>

        <div className="play-checkout-footer">
          {children}
          {note && <p role="status" className="pay-note-error">{note}</p>}
          <Button variant="ghost" className="play-buy" onClick={onBuy} disabled={busy}>
            <span className="pay-points" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</span>
            <span className="relative z-[1] inline-flex items-center gap-2">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t("Subscribe", "اشترك")}{price && <span dir="ltr">· ${price.price}</span>}</>}
            </span>
          </Button>
          <p className="pay-secure"><Lock className="h-3 w-3" />{t("Encrypted payment · only the last 4 digits are kept · cancel anytime", "دفع مشفّر · بنحتفظ بآخر ٤ أرقام بس · إلغاء في أي وقت")}</p>
        </div>
      </motion.div>
    </div>
  );
}
