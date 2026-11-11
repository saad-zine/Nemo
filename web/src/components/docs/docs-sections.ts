// The docs page navigation model: which sections exist and how they are grouped.

import { Compass, KeyRound, RefreshCw, Server, ShieldCheck, UserRound, Workflow, type LucideIcon } from "lucide-react";
import { MarkMoney } from "@/components/marks";

export type NavItem = { id: string; label: string; icon: LucideIcon | typeof MarkMoney };

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { id: "overview", label: "The idea", icon: Compass },
      { id: "flow", label: "The flow", icon: Workflow },
    ],
  },
  {
    label: "Process",
    items: [
      { id: "device", label: "Your device", icon: UserRound },
      { id: "layer", label: "Anonymization layer", icon: ShieldCheck },
      { id: "api", label: "Your model API", icon: Server },
      { id: "restore", label: "Reply restoration", icon: RefreshCw },
    ],
  },
  {
    label: "Access",
    items: [
      { id: "full-access", label: "Full access", icon: MarkMoney },
      { id: "the-key", label: "The key", icon: KeyRound },
    ],
  },
];

export const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
export const SECTION_IDS = ALL_ITEMS.map((item) => item.id);
