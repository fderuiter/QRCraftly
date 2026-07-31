import React from "react";
import { Button } from "../ui/Button";
import { QRType } from "../../types";
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
} from "lucide-react";

/**
 *
 */
interface TypeSelectorProps {
  /**
   *
   */
  currentType: QRType;
  /**
   *
   */
  onSelect: (type: QRType) => void;
}

const TYPE_ROUTES: Partial<Record<QRType, string>> = {
  [QRType.URL]: "/",
  [QRType.WIFI]: "/wifi-qr-code",
  [QRType.TEXT]: "/text-qr-code",
  [QRType.VCARD]: "/vcard-qr-code",
  [QRType.EMAIL]: "/email-qr-code",
  [QRType.PHONE]: "/phone-qr-code",
  [QRType.SMS]: "/sms-qr-code",
  [QRType.PAYMENT]: "/payment-qr-code",
};

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

/**
 *
 * @param root0
 * @param root0.currentType
 * @param root0.onSelect
 */
export const TypeSelector: React.FC<TypeSelectorProps> = ({
  currentType,
  onSelect,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const isArrowLeft = e.key === "ArrowLeft";
    const isArrowRight = e.key === "ArrowRight";
    const isSpace = e.key === " " || e.key === "Spacebar";
    const isEnter = e.key === "Enter";
    const isTab = e.key === "Tab";

    if (!isArrowLeft && !isArrowRight && !isSpace && !isEnter && !isTab) {
      return;
    }

    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')
    );
    const currentIndex = tabs.findIndex(tab => tab === document.activeElement);

    if (isArrowLeft || isArrowRight) {
      e.preventDefault();
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      if (isArrowRight) {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      const nextTab = tabs[nextIndex];
      if (nextTab) {
        nextTab.focus();
        const nextItem = ITEMS[nextIndex];
        if (nextItem) {
          onSelect(nextItem.type);
        }
      }
    }

    if (isSpace || isEnter) {
      if (currentIndex !== -1) {
        if (isSpace) {
          e.preventDefault();
        }
        const item = ITEMS[currentIndex];
        if (item) {
          onSelect(item.type);
        }
      }
    }

    if (isTab && !e.shiftKey) {
      const activePanel = document.querySelector('[role="tabpanel"]');
      if (activePanel) {
        const fields = Array.from(
          activePanel.querySelectorAll<HTMLElement>(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]:not([disabled])'
          )
        ).filter(el => {
          return el.offsetWidth > 0 || el.offsetHeight > 0 || (el as any).style?.display !== 'none';
        });
        const firstField = fields[0];
        if (firstField) {
          e.preventDefault();
          firstField.focus();
        }
      }
    }
  };

  return (
    <nav aria-label="QR Code Types">
      <ul
        role="tablist"
        aria-label="QR Code Types"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors duration-300"
      >
        {ITEMS.map((item) => {
          const route = TYPE_ROUTES[item.type];
          const isActive = currentType === item.type;
          const className = `flex flex-col w-full items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
            isActive
              ? "bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-teal-700 dark:text-teal-400"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent border border-transparent"
          }`;

          if (route) {
            return (
              <li key={item.type} role="presentation">
                {/* nosemgrep: require-isdangerousurl */}
                <a
                  id={`tab-${item.type}`}
                  role="tab"
                  aria-controls={`panel-${item.type}`}
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  href={route}
                  onClick={() => {
                    onSelect(item.type);
                  }}
                  className={className}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="whitespace-normal break-words w-full text-center text-slate-700 dark:text-slate-200">
                    {item.label}
                  </span>
                </a>
              </li>
            );
          }

          return (
            <li key={item.type} role="presentation">
              <Button
                id={`tab-${item.type}`}
                role="tab"
                aria-controls={`panel-${item.type}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                variant={isActive ? 'secondary' : 'ghost'}
                size="none"
                onClick={() => onSelect(item.type)}
                className="flex-col w-full h-auto items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium"
              >
                <item.icon className="w-4 h-4" />
                <span className="whitespace-normal break-words w-full text-center text-slate-700 dark:text-slate-200">
                  {item.label}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
