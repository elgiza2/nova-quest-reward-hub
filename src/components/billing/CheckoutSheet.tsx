/**
 * @doc Floating glass payment sheet: product + price, the chosen method, one buy
 * button; tapping the method opens the grouped methods list. Card numbers are
 * never stored here — only the masked last digits the payment provider returns.
 * Provider names are never shown to customers.
 */
import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, CreditCard, Globe2, Loader2, Plus, X } from "lucide-react";
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

function Simple({ slug }: { slug: BrandSlug }) {
  const b = BRAND_MARKS[slug];
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" role="img" aria-label={b.title}>
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
  let inner: React.ReactNode = <CreditCard className="h-5 w-5" strokeWidth={1.7} />;
  if (m.kind === "saved" && m.brand !== "card") inner = <BrandMark brand={m.brand} />;
  else if (m.kind === "vodafone") inner = <VodafoneMark />;
  else if (m.kind === "global" && m.id === "apple_pay") inner = <Simple slug="applepay" />;
  else if (m.kind === "global" && m.id === "google_pay") inner = <Simple slug="googlepay" />;
  else if (m.kind === "global") inner = <Globe2 className="h-5 w-5" strokeWidth={1.7} />;
  return <span className="play-method-icon">{inner}</span>;
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
        : m.kind === "global"
          ? m.id === "apple_pay"
            ? "Apple Pay"
            : m.id === "google_pay"
              ? "Google Pay"
              : t("More payment methods", "طرق دفع أخرى")
          : t("Add Visa / Mastercard", "أضف فيزا / ماستركارد");

  const sub = (m: SheetMethod) =>
    m.kind === "global" && m.id === "more"
      ? t("PayPal, Klarna, local banks and more", "PayPal و Klarna وبنوك محلية وغيرها")
      : m.kind === "new_card"
        ? t("Add a new card", "إضافة بطاقة جديدة")
        : null;

  const same = (a: SheetMethod, b: SheetMethod) =>
    a.kind === b.kind &&
    (a.kind !== "saved" || (b.kind === "saved" && a.id === b.id)) &&
    (a.kind !== "global" || (b.kind === "global" && a.id === b.id));

  const groups: Array<{ title: string; items: SheetMethod[] }> = [
    { title: t("Cards", "البطاقات"), items: [...savedCards, { kind: "new_card" }] },
    {
      title: t("Wallets", "المحافظ"),
      items: [
        ...(showVodafone ? [{ kind: "vodafone" } as const] : []),
        ...(showApplePay ? [{ kind: "global", id: "apple_pay" } as const] : []),
        { kind: "global", id: "google_pay" } as const,
      ],
    },
    { title: t("Other", "أخرى"), items: [{ kind: "global", id: "more" }] },
  ];

  const key = (m: SheetMethod) => (m.kind === "saved" ? m.id : m.kind === "global" ? m.id : m.kind);

  return (
    <div dir={ar ? "rtl" : "ltr"} className="play-checkout-overlay">
      <div className="absolute inset-0" onClick={busy ? undefined : onClose} />
      <motion.div role="dialog" aria-modal="true" aria-label={t("Checkout", "الدفع")}
        initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={IOS_SPRING}
        className="play-checkout">
        <span className="play-grabber" aria-hidden="true" />
        {list ? (
          <div className="pb-4">
            <div className="play-checkout-heading">
              <Button variant="ghost" className="play-back" onClick={() => setList(false)} aria-label={t("Back", "رجوع")}><ArrowRight className="h-5 w-5 ltr:rotate-180" /></Button>
              <h2>{t("Payment methods", "طرق الدفع")}</h2>
            </div>
            {groups.filter((g) => g.items.length).map((g) => (
              <section key={g.title} className="play-group">
                <p className="play-group-title">{g.title}</p>
                <ul className="play-group-list">
                  {g.items.map((m) => (
                    <li key={key(m)}>
                      <Button variant="ghost" className="play-method-row" onClick={() => { onSelect(m); setList(false); }}>
                        {m.kind === "new_card" ? <span className="play-method-icon"><Plus className="h-5 w-5" /></span> : <MethodIcon m={m} />}
                        <span className="play-method-label" dir="auto">
                          {label(m)}
                          {sub(m) && <small>{sub(m)}</small>}
                        </span>
                        {m.kind === "new_card" && <span className="flex items-center gap-1.5"><BrandMark brand="visa" /><BrandMark brand="mastercard" /></span>}
                        {same(m, selected) && <span className="play-method-check"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
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
                <h2>{plan?.name ?? "Megsy"}</h2>
                <p>{interval === "yearly" ? t("Yearly · renews automatically", "سنوي · يتجدد تلقائياً") : t("Monthly · renews automatically", "شهري · يتجدد تلقائياً")}</p>
              </div>
              {price && <span className="play-checkout-price" dir="ltr">${price.price}</span>}
            </div>
            <Button variant="ghost" className="play-method-row play-method-selected" onClick={() => setList(true)} disabled={busy}>
              {selected.kind === "new_card" ? <span className="play-method-icon"><CreditCard className="h-5 w-5" /></span> : <MethodIcon m={selected} />}
              <span className="play-method-label" dir="auto">{label(selected)}<small>{t("Change", "تغيير")}</small></span>
              <span className="play-method-arrow"><ChevronLeft className="h-4 w-4 ltr:rotate-180" /></span>
            </Button>
            <div className="play-checkout-footer">
              {children}
              {note && <p role="status" className="text-destructive">{note}</p>}
              <p>{t("Payments are encrypted. Only the last 4 digits of your card are shown. Cancel anytime.", "الدفع مشفّر. بنعرض آخر ٤ أرقام من بطاقتك بس. تقدر تلغي في أي وقت.")}</p>
              <Button variant="ghost" className="play-buy" onClick={onBuy} disabled={busy}>
                <span className="pay-points" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</span>
                <span className="relative z-[1] inline-flex items-center gap-2">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t("Subscribe", "اشترك")}{price && <span dir="ltr">· ${price.price}</span>}</>}</span>
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
