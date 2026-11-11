import { ALL_ITEMS, NAV_GROUPS } from "@/components/docs/docs-sections";

export function DocsSidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav aria-label="On this page" className="px-3 py-10">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.label} className={index > 0 ? "mt-6" : ""}>
          <p className="px-2 pb-2 text-[10px] font-bold tracking-[0.14em] text-faint uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const on = active === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={on ? "location" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      onSelect(item.id);
                    }}
                    className={`group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-bold outline-none transition-colors ${
                      on ? "text-fg" : "text-muted hover:bg-raised/60 hover:text-fg"
                    }`}
                  >
                    <Icon
                      className={`nav-icon size-4 ${on ? "text-lime" : ""}`}
                      strokeWidth={1.75}
                    />
                    <span className="truncate">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav
      aria-label="Sections"
      className="nice-scroll -mx-6 mb-8 flex gap-1 overflow-x-auto border-b border-line/70 px-6 pb-3 lg:hidden"
    >
      {ALL_ITEMS.map((item) => {
        const on = active === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(event) => {
              event.preventDefault();
              onSelect(item.id);
            }}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
              on ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
