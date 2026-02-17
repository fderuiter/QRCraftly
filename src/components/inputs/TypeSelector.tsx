import React from 'react';
import { QRType } from '../../types';
import { Wifi, Link, Type, Mail, UserSquare2, Phone, MessageSquare, CreditCard } from 'lucide-react';

interface TypeSelectorProps {
  currentType: QRType;
  onSelect: (type: QRType) => void;
}

export const TypeSelector: React.FC<TypeSelectorProps> = ({ currentType, onSelect }) => {
  return (
    <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors duration-300">
        {[
          { type: QRType.URL, icon: Link, label: 'URL' },
          { type: QRType.TEXT, icon: Type, label: 'Text' },
          { type: QRType.WIFI, icon: Wifi, label: 'WiFi' },
          { type: QRType.VCARD, icon: UserSquare2, label: 'Contact' },
          { type: QRType.EMAIL, icon: Mail, label: 'Email' },
          { type: QRType.PHONE, icon: Phone, label: 'Phone' },
          { type: QRType.SMS, icon: MessageSquare, label: 'SMS' },
          { type: QRType.PAYMENT, icon: CreditCard, label: 'Payment' },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => onSelect(item.type)}
            aria-pressed={currentType === item.type}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
              currentType === item.type
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="truncate w-full text-center text-slate-700 dark:text-slate-200">{item.label}</span>
          </button>
        ))}
    </div>
  );
};
