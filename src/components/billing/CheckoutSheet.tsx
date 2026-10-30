/**
 * @doc Google Play–style purchase sheet: brand header, product + price, the chosen
 * method row (light blue), one blue buy button. Tapping the method opens the
 * "Payment methods" page; "Add card" opens the add-card page. Card numbers are never
 * stored here — only the masked last digits the payment provider returns.
 * Provider names are never shown to customers.
 */
import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { ArrowLeft, Check, ChevronLeft, CreditCard, Globe2, Info, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./CardPreview";
import { BRAND_MARKS, type BrandSlug } from "@/lib/payments/brandMarks";
import { getDisplayPrice, getPlan, type PlanTier } from "@/data/pricingData";
import { useUserLang } from "@/lib/authI18n";

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
  email?: string | null;
  /** Card number / name / expiry / CVV fields for the add-card page. */
  cardFields?: React.ReactNode;
  /** Extra inputs under the method row (e.g. wallet number). */
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
    <svg viewBox="0 0 24 24" className="h-6 w-6" role="img" aria-label={b.title}>
      <path d={b.path} fill={`#${b.hex}`} />
    </svg>
  );
}

function MethodIcon({ m }: { m: SheetMethod }) {
  let inner: React.ReactNode = <CreditCard className="h-4 w-4" strokeWidth={1.8} />;
  if (m.kind === "saved" && m.brand !== "card") inner = <BrandMark brand={m.brand} />;
  else if (m.kind === "vodafone") inner = <Smartphone className="gp-wallet-ico h-4 w-4" strokeWidth={2} />;
  else if (m.kind === "global" && m.id === "apple_pay") inner = <Simple slug="applepay" />;
  else if (m.kind === "global" && m.id === "google_pay") inner = <Simple slug="googlepay" />;
  else if (m.kind === "global") inner = <Globe2 className="h-4 w-4" strokeWidth={1.8} />;
  return <span className="gp-ico">{inner}</span>;
}

type View = "main" | "list" | "add";

export default function CheckoutSheet(props: Props) {
  const { tier, interval, savedCards, showVodafone, showApplePay, selected, onSelect, onBuy, onClose, busy, note, email, cardFields, children } =
    props;
  const ar = useUserLang().startsWith("ar");
  const t = (en: string, a: string) => (ar ? a : en);
  const [view, setView] = useState<View>("main");
  const plan = getPlan(tier);
  const price = plan ? getDisplayPrice(plan, interval === "yearly") : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (view === "main" ? onClose() : setView("main"));
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, view]);

  const label = (m: SheetMethod) =>
    m.kind === "saved"
      ? `${m.brand === "visa" ? "Visa" : m.brand === "mastercard" ? "Mastercard" : t("Card", "بطاقة")} •••• ${m.last4}`
      : m.kind === "vodafone"
        ? "Vodafone Cash"
        : m.kind === "global"
          ? m.id === "apple_pay"
            ? "Apple Pay"
            : m.id === "google_pay"
              ? "Google Pay"
              : t("Other payment methods", "طرق دفع أخرى")
          : t("Add card", "إضافة بطاقة");

  const sub = (m: SheetMethod) =>
    m.kind === "vodafone"
      ? t("Approve the payment on your phone", "هتأكد الدفع من موبايلك")
      : m.kind === "global" && m.id === "more"
        ? t("PayPal, Klarna, local banks and more", "PayPal و Klarna وبنوك محلية وغيرها")
        : m.kind === "new_card"
          ? t("Visa or Mastercard", "فيزا أو ماستركارد")
          : null;

  const same = (a: SheetMethod, b: SheetMethod) =>
    a.kind === b.kind &&
    (a.kind !== "saved" || (b.kind === "saved" && a.id === b.id)) &&
    (a.kind !== "global" || (b.kind === "global" && a.id === b.id));

  const methods: SheetMethod[] = [
    ...savedCards,
    ...(showVodafone ? [{ kind: "vodafone" } as const] : []),
    ...(showApplePay ? [{ kind: "global", id: "apple_pay" } as const] : []),
    { kind: "global", id: "google_pay" } as const,
    { kind: "global", id: "more" } as const,
  ];
  const key = (m: SheetMethod) => (m.kind === "saved" ? m.id : m.kind === "global" ? m.id : m.kind);
  const buyLabel = t("Subscribe", "اشترك");
  const full = view !== "main";

  return (
    <div dir={ar ? "rtl" : "ltr"} className="gp-overlay">
      <div className="gp-scrim" onClick={busy ? undefined : onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "tween", duration: 0.28, ease: [0.2, 0, 0, 1] }}
        className="gp-sheet" data-full={full || undefined}>
        <div role="dialog" aria-modal="true" aria-label={t("Checkout", "الدفع")} className="contents">
        {view === "main" && (
          <>
            <div className="gp-brand"><span>Megsy AI</span></div>
            <div className="gp-product">
              <span className="gp-app-icon" aria-hidden="true">M</span>
              <div className="gp-product-name">
                <h2>{plan?.name ?? "Megsy"}</h2>
                <p>{interval === "yearly" ? t("Yearly subscription", "اشتراك سنوي") : t("Monthly subscription", "اشتراك شهري")}</p>
              </div>
              {price && <span className="gp-price" dir="ltr">${price.price}</span>}
            </div>
            <Button variant="ghost" className="gp-selected" onClick={() => setView("list")} disabled={busy}>
              {selected.kind === "new_card" ? <span className="gp-ico"><CreditCard className="h-4 w-4" strokeWidth={1.8} /></span> : <MethodIcon m={selected} />}
              <span className="gp-label" dir="auto">
                {label(selected)}
                <small>{selected.kind === "new_card" ? t("Tap to choose how to pay", "اختار طريقة الدفع") : interval === "yearly" ? t("Renews every year · cancel anytime", "يتجدد كل سنة · تقدر تلغي في أي وقت") : t("Renews every month · cancel anytime", "يتجدد كل شهر · تقدر تلغي في أي وقت")}</small>
              </span>
              <Info className="gp-info h-5 w-5" aria-hidden="true" />
              <span className="gp-chev"><ChevronLeft className="h-4 w-4 ltr:rotate-180" /></span>
            </Button>
            <div className="gp-foot">
              {children}
              {note && <p role="status" className="gp-error">{note}</p>}
              <p className="gp-hint">
                {t(`Tap "${buyLabel}" to complete your purchase. `, `انقر على "${buyLabel}" لإكمال عملية الشراء. `)}
                <a href="/terms" target="_blank" rel="noreferrer">{t("More", "المزيد")}</a>
              </p>
              <Button variant="ghost" className="gp-buy" onClick={() => (selected.kind === "new_card" ? setView("add") : onBuy())} disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : buyLabel}
              </Button>
            </div>
          </>
        )}

        {view === "list" && (
          <div className="gp-page">
            <div className="gp-page-head">
              <Button variant="ghost" className="gp-icon-btn" onClick={() => setView("main")} aria-label={t("Back", "رجوع")}>
                <ArrowLeft className="h-6 w-6 rtl:rotate-180" />
              </Button>
              <div>
                <h2>{t("Payment methods", "طرق الدفع")}</h2>
                {email && <p dir="ltr">{email}</p>}
              </div>
            </div>
            <ul className="gp-list">
              {methods.map((m) => (
                <li key={key(m)}>
                  <Button variant="ghost" className="gp-row" onClick={() => { onSelect(m); setView("main"); }}>
                    <MethodIcon m={m} />
                    <span className="gp-label" dir="auto">{label(m)}{sub(m) && <small>{sub(m)}</small>}</span>
                    {same(m, selected) && <span className="gp-check"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="gp-divider" />
            <p className="gp-section">{t("Add a payment method to your account", "إضافة طريقة دفع إلى حسابك")}</p>
            <Button variant="ghost" className="gp-row" onClick={() => { onSelect({ kind: "new_card" }); setView("add"); }}>
              <span className="gp-plain-ico"><CreditCard className="h-6 w-6" strokeWidth={2} /></span>
              <span className="gp-label">{t("Add card", "إضافة بطاقة")}</span>
              <span className="gp-brands" dir="ltr"><span className="gp-chip"><BrandMark brand="mastercard" /></span><span className="gp-chip"><BrandMark brand="visa" /></span></span>
            </Button>
          </div>
        )}

        {view === "add" && (
          <div className="gp-page">
            <div className="gp-page-head">
              <Button variant="ghost" className="gp-icon-btn" onClick={() => setView("list")} disabled={busy} aria-label={t("Back", "رجوع")}>
                <ArrowLeft className="h-6 w-6 rtl:rotate-180" />
              </Button>
              <div>
                <h2>{t("Add card", "إضافة بطاقة")}</h2>
                {email && <p dir="ltr">{email}</p>}
              </div>
            </div>
            <div className="gp-add-brands" dir="ltr"><span className="gp-chip"><BrandMark brand="visa" /></span><span className="gp-chip"><BrandMark brand="mastercard" /></span></div>
            <div className="gp-fields">{cardFields}</div>
            <div className="gp-foot gp-foot--page">
              {note && <p role="status" className="gp-error">{note}</p>}
              <p className="gp-hint">{t("Your card is saved securely with the payment provider. We only keep the last 4 digits.", "بطاقتك بتتحفظ بأمان عند مزود الدفع. إحنا بنحتفظ بآخر ٤ أرقام بس.")}</p>
              <Button variant="ghost" className="gp-buy" onClick={onBuy} disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t("Save and subscribe", "حفظ واشتراك")}
              </Button>
            </div>
          </div>
        )}
        </div>
      </motion.div>
    </div>
  );
}
