import { Contact } from "@/prisma/generated/prisma/client";

interface MentionsListProps {
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
  position: { top: number; left: number };
  selectedIndex: number;
}

export function MentionsList({
  contacts,
  onSelect,
  position,
  selectedIndex,
}: MentionsListProps) {
  if (contacts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 1000,
      }}
      className="bg-popover text-popover-foreground border rounded-md shadow-md max-h-[200px] overflow-auto w-[200px]"
    >
      {contacts.map((c, index) => (
        <div
          key={c.id}
          className={`p-2 text-sm cursor-pointer ${
            index === selectedIndex ? "bg-muted" : "hover:bg-muted"
          }`}
          onClick={() => onSelect(c)}
          ref={(el) => {
            if (index === selectedIndex && el) {
              el.scrollIntoView({ block: "nearest" });
            }
          }}
        >
          {c.name}
        </div>
      ))}
    </div>
  );
}
