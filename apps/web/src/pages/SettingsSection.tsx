/**
 * Placeholder for settings sections that are not yet implemented.
 * Shows "Coming soon" with a title derived from the route or passed as prop.
 */
import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

const PATH_TO_TITLE: Record<string, string> = {
  company: "Company Profile",
  user: "User Profile",
  users: "All Users / Roles",
  preferences: "Preferences",
  "thermal-print": "Thermal Print Settings",
  barcode: "Barcode Settings",
  signatures: "Signatures",
  notes: "Notes",
  terms: "Terms",
  "auto-reminders": "Auto Reminders",
  other: "Other",
  banks: "Banks",
  wallet: "Execora Wallet",
  api: "API & Webhooks",
  more: "More",
};

function getTitleFromPath(pathname: string): string {
  const segments = pathname.replace(/^\/settings\/?/, "").split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  return PATH_TO_TITLE[last ?? ""] ?? last ?? "This section";
}

const SettingsSection = ({ title }: { title?: string }) => {
  const location = useLocation();
  const displayTitle = title ?? getTitleFromPath(location.pathname);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Construction className="mx-auto h-12 w-12 text-muted-foreground/60 mb-4" />
        <h1 className="text-lg font-semibold mb-2">{displayTitle}</h1>
        <p className="text-muted-foreground text-sm">Coming soon</p>
      </div>
    </div>
  );
};

export default SettingsSection;
