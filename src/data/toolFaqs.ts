/**
 * Frequently asked questions for each generator page.
 *
 * The answers are rendered as text in the prerendered HTML (see `SidebarContent`) and as
 * FAQPage structured data (see `schemaGenerator`), so every statement here must stay true
 * to what the generator encodes and to the privacy pledge in `src/data/pledge.ts`.
 */

/** One question and its answer. */
export interface Faq {
  question: string;
  answer: string;
}

/** Shared answer: a static QR code has no server behind it, so it cannot be switched off. */
const NEVER_EXPIRES: Faq = {
  question: 'Will this QR code ever expire or stop working?',
  answer:
    'No. QRCraftly makes static QR codes: the information is stored in the pattern itself, not behind a redirect link on our servers. There is no trial, no subscription and nothing we could switch off, so the code keeps working for as long as the information in it is still correct.',
};

/**
 * Shared answer about where the typed data goes.
 * @param what - What the user types in, e.g. "your Wi-Fi password".
 * @returns The FAQ entry.
 */
const staysInBrowser = (what: string): Faq => ({
  question: `Is ${what} sent to QRCraftly?`,
  answer: `No. The QR code is generated in your browser, and ${what} is never uploaded, stored or logged by us. QRCraftly has no accounts, no ads and no analytics.`,
});

/** Generator FAQs keyed by content registry id. */
export const toolFaqs: Record<string, Faq[]> = {
  index: [
    {
      question: 'Is QRCraftly really free?',
      answer:
        'Yes. Every generator, style option and download format is free, with no sign-up, no watermark and no limit on how many codes you make. QRCraftly is not ad supported and never will be.',
    },
    NEVER_EXPIRES,
    {
      question: 'What is the difference between a static and a dynamic QR code?',
      answer:
        'A static QR code contains your link or data directly, so it works forever and nobody can track or disable it. A dynamic QR code contains a short link to a company\'s server, which forwards scans to your destination. That lets you change the destination and count scans, but the code stops working if the service shuts down or you stop paying.',
    },
    {
      question: 'Can I add a logo or change the colours?',
      answer:
        'Yes. You can change the colours, module and corner shapes, add a logo, or tile your own image into the code with Mosaic QR. QRCraftly checks the result with a real scanner as you design, so you can see whether it still scans before you download it.',
    },
    {
      question: 'Which file formats can I download?',
      answer:
        'You can download PNG, JPEG and WebP images for screens and printing, or SVG vector files that stay sharp at any size.',
    },
    staysInBrowser('the link I enter'),
  ],
  'wifi-qr-code': [
    {
      question: 'Which phones can join Wi-Fi from a QR code?',
      answer:
        'Most modern phones can. On iPhone (iOS 11 and later) and on most Android phones (Android 10 and later), point the camera at the code and tap the prompt to join. Older Android phones can use Google Lens or a scanner app.',
    },
    staysInBrowser('my Wi-Fi password'),
    {
      question: 'Can anyone read the password from the QR code?',
      answer:
        'Yes. The password is stored in the code as plain text so that phones can join, and any QR scanner app can display it. Only put the code where you would be happy to share the password, such as inside your home, office or café.',
    },
    {
      question: 'Does it work with hidden networks and WPA3?',
      answer:
        'Yes. Tick "Hidden Network" if your network does not broadcast its name. Choose WPA/WPA2/WPA3 for almost all home and business routers. WEP, WPA2 Enterprise (EAP) and open networks are also supported.',
    },
    {
      question: 'What happens if I change my Wi-Fi password?',
      answer:
        'The old QR code will stop connecting, because the old password is stored inside it. Make a new code with the new password; it only takes a few seconds.',
    },
  ],
  'vcard-qr-code': [
    {
      question: 'What happens when someone scans a vCard QR code?',
      answer:
        'Their phone shows your contact card and offers to save it, with your name, phone number, email address, company, job title, website and address already filled in. No app or internet connection is needed.',
    },
    {
      question: 'Does a vCard QR code work on iPhone and Android?',
      answer:
        'Yes. QRCraftly writes a standard vCard 3.0 contact, which the built-in camera apps on iPhone and Android can read and save to the address book.',
    },
    {
      question: 'Why is my vCard QR code so dense?',
      answer:
        'Every field is stored inside the code, so a long address or many filled-in fields make it bigger and harder to scan. Leave out fields you do not need, and print business-card codes at least 2 cm (0.8 in) wide.',
    },
    staysInBrowser('my contact information'),
    NEVER_EXPIRES,
  ],
  'email-qr-code': [
    {
      question: 'What happens when someone scans an email QR code?',
      answer:
        'Their phone opens its email app with a new message already addressed, with your subject line and message text filled in. They only have to tap Send.',
    },
    {
      question: 'Can I leave the subject or message empty?',
      answer:
        'Yes. Only the email address is needed. Pre-filling the subject makes it easier to sort replies, for example "Feedback: spring menu" or "Support request".',
    },
    staysInBrowser('the email address I enter'),
    NEVER_EXPIRES,
  ],
  'sms-qr-code': [
    {
      question: 'What happens when someone scans an SMS QR code?',
      answer:
        'Their phone opens its messaging app with a text to your number, and your message already typed. Nothing is sent until they tap Send.',
    },
    {
      question: 'What are SMS QR codes used for?',
      answer:
        'Common uses are text-to-join lists, support and booking requests, voting and competitions, and letting customers report a problem by text without typing a number.',
    },
    staysInBrowser('the phone number I enter'),
    NEVER_EXPIRES,
  ],
  'phone-qr-code': [
    {
      question: 'What happens when someone scans a phone QR code?',
      answer:
        'Their phone shows your number and offers to call it. The call is not started automatically; they confirm it first.',
    },
    {
      question: 'Should I include the country code?',
      answer:
        'Yes, if people might scan the code from another country or on a roaming phone. Start the number with + and the country code, for example +1 for the United States or +44 for the United Kingdom.',
    },
    staysInBrowser('the phone number I enter'),
    NEVER_EXPIRES,
  ],
  'event-qr-code': [
    {
      question: 'What happens when someone scans an event QR code?',
      answer:
        'Their phone offers to add the event to their calendar, with the title, start and end time, location and description filled in.',
    },
    {
      question: 'Which calendar apps are supported?',
      answer:
        'The code contains a standard iCalendar (VEVENT) entry. iPhone adds it to Apple Calendar directly. On Android, support depends on the camera or scanner app; Google Lens and most scanner apps can add it to Google Calendar.',
    },
    staysInBrowser('my event details'),
    NEVER_EXPIRES,
  ],
  'location-qr-code': [
    {
      question: 'What happens when someone scans a location QR code?',
      answer:
        'Their phone opens the location in a maps app such as Google Maps or Apple Maps, ready for directions.',
    },
    {
      question: 'How do I find the coordinates of a place?',
      answer:
        'In Google Maps, press and hold (or right-click) the spot, and the coordinates appear at the top. In Apple Maps, drop a pin and swipe up to see them. Copy them into the latitude and longitude fields.',
    },
    staysInBrowser('the location I enter'),
    NEVER_EXPIRES,
  ],
  'meeting-qr-code': [
    {
      question: 'Which meeting services does this work with?',
      answer:
        'Any service with a join link, including Zoom, Microsoft Teams and Google Meet. The QR code contains the join link itself, so scanning it opens the meeting in the app or browser.',
    },
    {
      question: 'Will the code still work if I reschedule the meeting?',
      answer:
        'Only if the join link stays the same. Recurring meetings and personal meeting rooms usually keep one link; one-off meetings often get a new link, which needs a new QR code.',
    },
    staysInBrowser('my meeting link'),
    NEVER_EXPIRES,
  ],
  'payment-qr-code': [
    {
      question: 'Which cryptocurrencies are supported?',
      answer:
        'Bitcoin, Ethereum, Solana and Litecoin, plus a custom option where you paste a payment link for any other network. For the listed networks the code uses the standard payment link format of each network (for example BIP 21 for Bitcoin and EIP-681 for Ethereum), which most wallet apps can read.',
    },
    {
      question: 'Can I request a specific amount?',
      answer:
        'Yes. Add an amount and the wallet app fills it in when the code is scanned. The payer still reviews and confirms the payment in their wallet.',
    },
    {
      question: 'Is it safe to share a payment QR code?',
      answer:
        'A payment QR code only contains your public receiving address, which is safe to share. Always check the address in the preview before printing, and never put a private key or recovery phrase in a QR code.',
    },
    staysInBrowser('my wallet address'),
  ],
  'social-qr-code': [
    {
      question: 'Which social networks are supported?',
      answer:
        'Instagram, X (Twitter) and TikTok. Enter your username and the code links straight to your profile, which opens in the app if it is installed.',
    },
    {
      question: 'What if I change my username?',
      answer:
        'The code links to the username it was made with, so it will point to the old profile. Make a new code after renaming your account.',
    },
    staysInBrowser('my profile name'),
    NEVER_EXPIRES,
  ],
  'text-qr-code': [
    {
      question: 'What happens when someone scans a text QR code?',
      answer:
        'The scanner shows your text on screen. It works offline and does not open any website, which makes it useful for notes, codes, instructions and labels.',
    },
    {
      question: 'How much text can a QR code hold?',
      answer:
        'Up to a few thousand characters, but short text scans far more reliably. Keep it to a few sentences, and use a larger print size for longer messages.',
    },
    staysInBrowser('my text'),
    NEVER_EXPIRES,
  ],
};
