interface CoreValueTheme {
  iconBgClass: string;
  iconTextClass: string;
}

export interface CoreValue {
  key: string;
  title: string;
  description: string;
  icon: string;
  theme: CoreValueTheme;
  faqQuestion: string;
}

export const coreValues: CoreValue[] = [
  {
    key: "free-no-login",
    title: "Free & No Login",
    description: "QRCraftly is completely free to use. No sign-up, no login, and no hidden fees. Just generate your QR codes instantly.",
    icon: "Zap",
    theme: {
      iconBgClass: "bg-amber-100 dark:bg-amber-900/30",
      iconTextClass: "text-amber-700 dark:text-amber-400"
    },
    faqQuestion: "Is QRCraftly free?"
  },
  {
    key: "no-third-party-tracking",
    title: "No Third-Party Tracking",
    description: "We do not use tracking pixels, cookies, or third-party analytics. We only collect basic server logs for performance and reliability.",
    icon: "Shield",
    theme: {
      iconBgClass: "bg-teal-100 dark:bg-teal-900/30",
      iconTextClass: "text-teal-700 dark:text-teal-400"
    },
    faqQuestion: "Does QRCraftly track users?"
  },
  {
    key: "privacy-first",
    title: "Privacy First",
    description: "We utilize a Privacy First architecture. Your content is processed entirely in your browser and not transmitted to our servers without your explicit opt-in for telemetry.",
    icon: "Database",
    theme: {
      iconBgClass: "bg-rose-100 dark:bg-rose-900/30",
      iconTextClass: "text-rose-700 dark:text-rose-400"
    },
    faqQuestion: "Is my data secure?"
  },
  {
    key: "open-source",
    title: "Open Source",
    description: "Our code is open for inspection and contribution. We believe in transparency.",
    icon: "Code",
    theme: {
      iconBgClass: "bg-indigo-100 dark:bg-indigo-900/30",
      iconTextClass: "text-indigo-700 dark:text-indigo-400"
    },
    faqQuestion: "Is QRCraftly open source?"
  }
];
