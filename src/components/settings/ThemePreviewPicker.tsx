/** @doc Appearance picker — three live theme previews with a clear selection ring. */
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translateExactText, useUserLang } from "@/lib/authI18n";
import type { ThemeMode } from "@/lib/theme";

const OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];


export default function ThemePreviewPicker({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  const lang = useUserLang();
  const tx = (s: string) => translateExactText(s, lang);

  return (
    <div className="th-picker" role="radiogroup" aria-label={tx("Appearance")}>
      {OPTIONS.map(({ value: mode, label }) => {
        const on = value === mode;
        return (
          <Button variant="ghost"
            key={mode}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={tx(label)}
            data-on={on ? "true" : "false"}
            onClick={() => onChange(mode)}
            className="th-opt"
          >
            {mode === "light" ? <Sun aria-hidden="true" /> : mode === "dark" ? <Moon aria-hidden="true" /> : <Monitor aria-hidden="true" />}
            <span className="th-opt-label">{tx(label)}</span>
          </Button>
        );
      })}
    </div>
  );
}

