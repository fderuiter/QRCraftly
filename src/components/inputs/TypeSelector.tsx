import React from "react";
import { QR_TYPE_ROUTES } from "../../data/navigation";
import { QRType } from "../../types";
import { isDangerousUrl } from "../../utils/security";
import {
  Wifi,
  Link,
  Type,
  Mail,
  UserSquare2,
  Phone,
  MessageSquare,
  CreditCard,
  Calendar,
  MapPin,
  Video,
  Share2,
  Check,
} from "lucide-react";

/**
 * Properties for {@link TypeSelector}.
 */
interface TypeSelectorProps {
  /** The QR type of the current route; marked with `aria-current="page"`. */
  currentType: QRType;
}

/**
 * Single-code types, four per row. Bulk CSV is a batch tool rather than a single-code type, so it is
 * linked from the generator list instead: a thirteenth item would add a row and push the content
 * field below the first screen on small phones (#795).
 */
const ITEMS = [
  { type: QRType.URL, icon: Link, label: "URL" },
  { type: QRType.TEXT, icon: Type, label: "Text" },
  { type: QRType.WIFI, icon: Wifi, label: "WiFi" },
  { type: QRType.EVENT, icon: Calendar, label: "Event" },
  { type: QRType.VCARD, icon: UserSquare2, label: "Contact" },
  { type: QRType.EMAIL, icon: Mail, label: "Email" },
  { type: QRType.PHONE, icon: Phone, label: "Phone" },
  { type: QRType.SMS, icon: MessageSquare, label: "SMS" },
  { type: QRType.PAYMENT, icon: CreditCard, label: "Payment" },
  { type: QRType.LOCATION, icon: MapPin, label: "Location" },
  { type: QRType.MEETING, icon: Video, label: "Meeting" },
  { type: QRType.SOCIAL, icon: Share2, label: "Social" },
];

const LINK_BASE =
  "relative flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-sm font-medium transition duration-(--duration-fast) ease-standard motion-safe:active:scale-98";
/* Selection is a filled tint plus a check badge, distinct from the offset focus ring. */
const LINK_CURRENT = "border-accent-strong bg-accent-soft font-semibold text-accent-strong shadow-raised";
const LINK_IDLE = "border-transparent text-fg-soft hover:bg-surface-hover hover:text-fg";

/**
 * QR type navigation. Each type has its own route, so the choices are ordinary links in a
 * labelled `nav` list: Tab reaches each one, arrow keys are left to the browser, and the
 * current route is announced with `aria-current="page"`. Following a link is a normal page
 * navigation; uncommitted form state is kept in a volatile in-memory cache across route switches
 * (never stored in browser storage), and clearing browser memory or reloading starts fresh.
 * @param root0 - Component properties.
 * @param root0.currentType - The type of the current route.
 * @returns The QR type navigation.
 */
export const TypeSelector: React.FC<TypeSelectorProps> = ({ currentType }) => {
  return (
    <nav aria-label="QR code types">
      <ul className="grid grid-cols-4 gap-2 rounded-xl bg-surface-hover p-2">
        {ITEMS.map((item) => {
          const isCurrent = currentType === item.type;
          const href = QR_TYPE_ROUTES[item.type];
          if (!isDangerousUrl(href)) {
            return (
              <li key={item.type}>
                <a
                  href={href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`${LINK_BASE} ${isCurrent ? LINK_CURRENT : LINK_IDLE}`}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  <span className="w-full text-center break-words whitespace-normal">{item.label}</span>
                  {isCurrent && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-action text-on-action"
                    >
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  )}
                </a>
              </li>
            );
          }
          return null;
        })}
      </ul>
    </nav>
  );
};
