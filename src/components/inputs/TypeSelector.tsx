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

interface TypeSelectorProps {
  currentType: QRType;
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

export const TypeSelector: React.FC<TypeSelectorProps> = ({
  currentType,
  onSelect,
}) => {
  return (
    <nav aria-label="QR Code Types">
      <ul className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors duration-300">
        {[
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
        ].map((item) => {
          const route = TYPE_ROUTES[item.type];
          const isActive = currentType === item.type;
          const className = `flex flex-col w-full items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
            isActive
              ? "bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-teal-700 dark:text-teal-400"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent border border-transparent"
          }`;

          if (route) {
            return (
              <li key={item.type}>
                {/* nosemgrep: require-isdangerousurl */}
                <a
                  href={route}
                  onClick={() => onSelect(item.type)}
                  aria-current={isActive ? "page" : undefined}
                  className={className}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="truncate w-full text-center text-slate-700 dark:text-slate-200">
                    {item.label}
                  </span>
                </a>
              </li>
            );
          }

          return (
            <li key={item.type}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="none"
                onClick={() => onSelect(item.type)}
                aria-pressed={isActive}
                className="flex-col w-full h-auto items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium"
              >
                <item.icon className="w-4 h-4" />
                <span className="truncate w-full text-center text-slate-700 dark:text-slate-200">
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
