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
  FileSpreadsheet,
} from "lucide-react";

/**
 * Properties for {@link TypeSelector}.
 */
interface TypeSelectorProps {
  /** The QR type of the current route; marked with `aria-current="page"`. */
  currentType: QRType;
}

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
  { type: QRType.BULK_CSV, icon: FileSpreadsheet, label: "Bulk CSV Batch", wide: true },
];

const LINK_BASE =
  "flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors";
const LINK_CURRENT =
  "border-teal-700 bg-accent-soft font-semibold text-teal-800 shadow-sm ring-1 ring-teal-700 dark:border-teal-300 dark:text-teal-100 dark:ring-teal-300";
const LINK_IDLE =
  "border-transparent text-fg-soft hover:bg-slate-200/60 hover:text-fg dark:hover:bg-slate-700/50";

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
      <ul className="grid grid-cols-4 gap-1.5 rounded-xl bg-surface-hover p-2 transition-colors duration-300">
        {ITEMS.map((item) => {
          const isCurrent = currentType === item.type;
          const href = QR_TYPE_ROUTES[item.type];
          if (!isDangerousUrl(href)) {
            return (
              // The batch tool spans the last row with its label beside the icon.
              <li key={item.type} className={item.wide ? "col-span-4" : undefined}>
                <a
                  href={href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`${LINK_BASE} ${item.wide ? "gap-2" : "flex-col"} ${isCurrent ? LINK_CURRENT : LINK_IDLE}`}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  <span className={item.wide ? undefined : "w-full text-center break-words whitespace-normal"}>{item.label}</span>
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
