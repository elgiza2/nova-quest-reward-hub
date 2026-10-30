/** @doc Settings route pass-through shell; desktop uses the same mobile settings experience. */
import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

type ShellCtx = { mainEl: HTMLElement | null; active: boolean };

const SettingsShellContext = createContext<ShellCtx>({ mainEl: null, active: false });

export const useSettingsShell = () => useContext(SettingsShellContext);

export function SettingsShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const settings = pathname === "/settings" || pathname.startsWith("/settings/");
  return (
    <SettingsShellContext.Provider value={{ mainEl: null, active: false }}>
      <div data-settings-surface={settings ? "true" : undefined} className="contents">{children}</div>
    </SettingsShellContext.Provider>
  );
}

export default SettingsShell;
