import { getPublicDomain, getSanitizedPath } from "../utils/metadataEngine";
import { toolFaqs } from "./toolFaqs";
import { landingPageContent } from "./landingPageContent";

export enum SchemaType {
  SoftwareApplication = "SoftwareApplication",
  WebApplication = "WebApplication",
  AboutPage = "AboutPage",
  FAQPage = "FAQPage",
  HowTo = "HowTo"
}

export enum SchemaCategory {
  UtilitiesApplication = "UtilitiesApplication",
  BusinessApplication = "BusinessApplication",
  SocialNetworkingApplication = "SocialNetworkingApplication",
  TravelApplication = "TravelApplication",
  DeveloperApplication = "DeveloperApplication"
}

export enum TargetPersona {
  HealthcareLegal = "Healthcare & Legal",
  SecurityConsciousEnterprise = "Security-Conscious Enterprise"
}

export enum StrategicValueCategory {
  ZeroTransitPrivacySovereignty = "Zero-Transit Privacy Sovereignty",
  AsynchronousWebWorkerDiagnostics = "Asynchronous Web Worker Diagnostics"
}

export interface ToolContent {
  id: string;
  name: string;
  url: string;
  description: string;
  seoTitle?: string;
  /** Visible H1 on generator pages; falls back to the page's own title. */
  heading?: string;
  /** Opening paragraph shown above the how-to steps. */
  intro?: string;
  image: string;
  imageAlt: string;
  ogImage?: string;
  ogImageAlt?: string;
  features: string[];
  howTo?: {
    name: string;
    description: string;
    supply?: { name: string }[];
    steps: { name: string; text: string }[];
  };
  faqs?: { question: string; answer: string }[];
  schemaType: SchemaType | SchemaType[];
  schemaCategory: SchemaCategory;
  personas: TargetPersona[];
  valueProposition: StrategicValueCategory;
}

export interface AuxiliaryContent {
  id: string;
  name: string;
  seoTitle: string;
  description: string;
  image: string;
  imageAlt: string;
  ogImage?: string;
  ogImageAlt?: string;
  personas: TargetPersona[];
  valueProposition: StrategicValueCategory;
}

/**
 * Type guard enforcing mandatory Open Graph image attributes on a content definition.
 */
export function hasValidOgImage<T extends { image?: string; imageAlt?: string; ogImage?: string; ogImageAlt?: string }>(
  item: T
): item is T & { image: string; imageAlt: string } {
  const img = item.image || item.ogImage;
  const alt = item.imageAlt || item.ogImageAlt;
  return typeof img === 'string' && img.trim().length > 0 && typeof alt === 'string' && alt.trim().length > 0;
}

/**
 * Type guard checking if an unknown object is a valid ToolContent with mandatory OG image attributes.
 */
export function isToolContent(item: unknown): item is ToolContent {
  if (!item || typeof item !== 'object') return false;
  const tool = item as Partial<ToolContent>;
  return (
    typeof tool.id === 'string' &&
    typeof tool.name === 'string' &&
    typeof tool.description === 'string' &&
    typeof tool.image === 'string' && tool.image.trim().length > 0 &&
    typeof tool.imageAlt === 'string' && tool.imageAlt.trim().length > 0
  );
}

/**
 * Builds the registry entry of a landing page from its copy (#1035, #1036, #1037). The page's
 * share image, address and schema.org type come from here, so each page needs one copy block.
 */
function landingEntry(id: string): ToolContent {
  const copy = landingPageContent[id];
  return {
    id,
    name: copy.name,
    url: getPublicDomain() + "/" + id,
    description: copy.description,
    seoTitle: copy.seoTitle,
    heading: copy.heading,
    image: `/og/${id}.png`,
    imageAlt: copy.imageAlt,
    features: copy.features,
    schemaType: [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    schemaCategory: SchemaCategory.UtilitiesApplication,
    personas: [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    valueProposition: StrategicValueCategory.ZeroTransitPrivacySovereignty,
    howTo: copy.howTo,
    faqs: copy.faqs,
  };
}

export const contentRegistry: Record<string, ToolContent> = {
  "about": {
    "id": "about",
    "name": "About QRCraftly",
    "url": getPublicDomain() + "/about",
    "description": "Learn about QRCraftly's mission to provide a free, secure, and open-source QR code generator with privacy-first architecture.",
    "seoTitle": "About QRCraftly - Privacy & Open Source",
    "image": "/og/about.png",
    "imageAlt": "About QRCraftly - Privacy & Open Source",
    "features": [],
    "schemaType": SchemaType.AboutPage,
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": [
      {
        "question": "Is QRCraftly free?",
        "answer": "QRCraftly is completely free to use. No sign-up, no login, and no hidden fees. Just generate your QR codes instantly."
      },
      {
        "question": "Does QRCraftly show ads?",
        "answer": "No, and it never will. QRCraftly is not ad supported; the project would be shut down before it ever showed an ad. Read the QRCraftly Pledge at /free-forever."
      },
      {
        "question": "Does QRCraftly track users?",
        "answer": "No. QRCraftly has no analytics, no tracking cookies, no tracking pixels and no third-party scripts. Our host, Cloudflare, handles each page request (IP address, browser, page address and time) to serve the site and block attacks, but the content of your QR codes is never part of any request."
      },
      {
        "question": "Is my data secure?",
        "answer": "Yes. Your content is processed entirely in your browser and is never sent to a server. QRCraftly has no diagnostics or reporting of any kind."
      },
      {
        "question": "Is QRCraftly open source?",
        "answer": "Our code is open for inspection and contribution. We believe in transparency."
      }
    ]
  },
  "free-forever": {
    "id": "free-forever",
    "name": "The QRCraftly Pledge",
    "url": getPublicDomain() + "/free-forever",
    "description": "Free QR codes that never expire. No sign-up, no ads, nothing leaves your browser. QRCraftly will shut down before it ever becomes ad supported.",
    "seoTitle": "Free QR Codes: No Ads, No Tracking, Never Expire - QRCraftly",
    "image": "/og/free-forever.png",
    "imageAlt": "The QRCraftly Pledge: no ads, no tracking, free forever",
    "features": [
      "No Ads, Ever",
      "No Tracking or Analytics",
      "Entirely Client-Side",
      "Completely Free, No Sign-Up"
    ],
    "schemaType": SchemaType.AboutPage,
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": [
      {
        "question": "Is there a QR code generator with no ads?",
        "answer": "Yes. QRCraftly is not ad supported and never will be. There are no banner ads, sponsored placements, affiliate links or paid upgrades."
      },
      {
        "question": "Does QRCraftly track me?",
        "answer": "No. There are no analytics, tracking cookies, tracking pixels or third-party scripts, and the site's Content Security Policy blocks connections to any other server. Cloudflare, which hosts the site, sees ordinary request information such as your IP address to deliver pages, but never the content of your QR codes."
      },
      {
        "question": "Is my QR code data sent to a server?",
        "answer": "No. QR codes are generated entirely in your browser. What you type, upload or scan never leaves your device."
      },
      {
        "question": "Do QRCraftly QR codes expire?",
        "answer": "No. QRCraftly makes static QR codes: the content is stored in the code itself, so there is no account, subscription or server that could switch it off. A code you make today keeps working as long as the thing it points to exists."
      },
      {
        "question": "What happens if QRCraftly can't pay for itself?",
        "answer": "It will be shut down before it ever shows an ad. The only way the project would change hands is an outright purchase of the whole project."
      }
    ]
  },
  "email-qr-code": {
    "id": "email-qr-code",
    "name": "Email QR Code Generator",
    "url": getPublicDomain() + "/email-qr-code",
    "description": "Make an email QR code in seconds. Scanning opens a ready-to-send message. Free forever, no ads, no sign-up, and your text stays in your browser.",
    "seoTitle": "Free Email QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free Email QR Code Generator",
    "image": "/og/email-qr-code.png",
    "imageAlt": "Preview of the Email QR Code Generator tool",
    "features": [
      "Generate Pre-filled Emails",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["email-qr-code"],
    "howTo": {
      "name": "How to Create an Email QR Code",
      "description": "Generate a QR code that opens a drafted email.",
      "steps": [
        {
          "name": "Enter Details",
          "text": "Fill in the recipient, subject, and body of the email."
        },
        {
          "name": "Customize",
          "text": "Choose a style and color for your QR code."
        },
        {
          "name": "Download",
          "text": "Save the QR code and print it on business cards or flyers."
        }
      ]
    }
  },
  "event-qr-code": {
    "id": "event-qr-code",
    "name": "Event QR Code Generator",
    "url": getPublicDomain() + "/event-qr-code",
    "description": "Make a calendar event QR code in seconds. Guests add it with one scan. Free forever, no ads, no sign-up, and your details stay in your browser.",
    "seoTitle": "Free Event QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free Calendar Event QR Code Generator",
    "image": "/og/event-qr-code.png",
    "imageAlt": "Preview of the Event QR Code Generator tool",
    "features": [
      "Generate Calendar Event QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["event-qr-code"],
    "howTo": {
      "name": "How to Create an Event QR Code",
      "description": "Generate a QR code that prompts users to add an event to their calendar.",
      "steps": [
        {
          "name": "Enter Event Details",
          "text": "Fill in the event title, start and end date, location, and description."
        },
        {
          "name": "Customize",
          "text": "Choose a style and color for your QR code."
        },
        {
          "name": "Download",
          "text": "Download the image and share or print it."
        }
      ]
    }
  },
  "index": {
    "id": "index",
    "name": "QRCraftly",
    "url": getPublicDomain(),
    "description": "Make free QR codes that never expire. No sign-up, no ads, no tracking: every code is made in your browser. Add colours, logos and image mosaics.",
    "seoTitle": "Free QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free QR Code Generator",
    "intro": "QRCraftly makes static QR codes that work forever: no trial that switches your printed codes off, no account, no watermark and no ads. Everything is generated in your browser, so your links, Wi-Fi passwords and contact details never reach our servers. Style your code with colours, shapes, a logo or your own image, and check that it scans before you download it.",
    "image": "/og/index.png",
    "imageAlt": "Preview of the QRCraftly Free QR Code Generator",
    "features": [
      "Custom QR Codes",
      "WiFi QR Codes",
      "vCard",
      "Secure Client-Side Generation",
      "Artistic Styles"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "howTo": {
      "name": "How to Create a URL QR Code",
      "description": "Convert any website URL into a scannable QR code instantly.",
      "steps": [
        {
          "name": "Enter URL",
          "text": "Paste your website address (URL) into the input field."
        },
        {
          "name": "Customize Design",
          "text": "Adjust colors, add a logo, or change the pattern style."
        },
        {
          "name": "Download QR Code",
          "text": "Save your custom QR code as a PNG, JPEG or WebP image, or as an SVG vector file."
        }
      ]
    },
    "faqs": toolFaqs["index"]
  },
  "location-qr-code": {
    "id": "location-qr-code",
    "name": "Location QR Code Generator",
    "url": getPublicDomain() + "/location-qr-code",
    "description": "Make a location QR code in seconds. Scanning opens the place in a maps app. Free forever, no ads, no sign-up, and nothing is uploaded.",
    "seoTitle": "Free Location QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free Location QR Code Generator",
    "image": "/og/location-qr-code.png",
    "imageAlt": "Preview of the Location QR Code Generator tool",
    "features": [
      "Generate Location QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["location-qr-code"],
    "howTo": {
      "name": "How to Create a Location QR Code",
      "description": "Generate a QR code that opens a location in maps.",
      "steps": [
        {
          "name": "Enter Coordinates",
          "text": "Input the latitude and longitude of the location."
        },
        {
          "name": "Customize",
          "text": "Adjust colors, patterns, and style to fit your design."
        },
        {
          "name": "Download",
          "text": "Save the QR code and use it on invites or signage."
        }
      ]
    }
  },
  "meeting-qr-code": {
    "id": "meeting-qr-code",
    "name": "Meeting QR Code Generator",
    "url": getPublicDomain() + "/meeting-qr-code",
    "description": "Make a meeting QR code in seconds. Zoom, Teams or Meet links open with a scan. Free forever, no ads, no sign-up, and your link stays in your browser.",
    "seoTitle": "Free Meeting QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free Meeting QR Code Generator",
    "image": "/og/meeting-qr-code.png",
    "imageAlt": "Preview of the Meeting QR Code Generator tool",
    "features": [
      "Generate Virtual Meeting QR",
      "Zoom/Teams/Meet Support",
      "Secure Client-Side"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["meeting-qr-code"],
    "howTo": {
      "name": "How to Create a Meeting QR Code",
      "description": "Generate a QR code that directs users to a virtual meeting.",
      "steps": [
        {
          "name": "Paste Meeting Link",
          "text": "Copy and paste your virtual meeting invite URL."
        },
        {
          "name": "Customize",
          "text": "Choose patterns, colors, and add a center logo."
        },
        {
          "name": "Download",
          "text": "Save and distribute the QR code to your meeting attendees."
        }
      ]
    }
  },
  "payment-qr-code": {
    "id": "payment-qr-code",
    "name": "Payment QR Code Generator",
    "url": getPublicDomain() + "/payment-qr-code",
    "description": "Make a crypto payment QR code in seconds. Bitcoin, Ethereum, Solana and Litecoin. Free forever, no ads, no sign-up, and your address stays in your browser.",
    "seoTitle": "Free Crypto Payment QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free Crypto Payment QR Code Generator",
    "image": "/og/payment-qr-code.png",
    "imageAlt": "Preview of the Payment QR Code Generator tool",
    "features": [
      "Generate Crypto Payment QR",
      "Bitcoin/Ethereum Support",
      "Secure Client-Side"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.BusinessApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["payment-qr-code"],
    "howTo": {
      "name": "How to Create a Payment QR Code",
      "description": "Generate a QR code to receive cryptocurrency payments.",
      "steps": [
        {
          "name": "Select Network",
          "text": "Choose the cryptocurrency network (e.g., Bitcoin, Ethereum)."
        },
        {
          "name": "Enter Address",
          "text": "Paste your wallet address and optional amount."
        },
        {
          "name": "Customize & Download",
          "text": "Style your QR code and save it."
        }
      ]
    }
  },
  "phone-qr-code": {
    "id": "phone-qr-code",
    "name": "Phone QR Code Generator",
    "url": getPublicDomain() + "/phone-qr-code",
    "description": "Make a phone QR code in seconds. Scanning opens the dialer with your number ready. Free forever, no ads, no sign-up, and nothing is uploaded.",
    "seoTitle": "Free Phone QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free Phone QR Code Generator",
    "image": "/og/phone-qr-code.png",
    "imageAlt": "Preview of the Phone QR Code Generator tool",
    "features": [
      "Generate Click-to-Call QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["phone-qr-code"],
    "howTo": {
      "name": "How to Create a Phone QR Code",
      "description": "Create a QR code that prompts the user to dial a number.",
      "steps": [
        {
          "name": "Enter Number",
          "text": "Input the phone number you want people to call."
        },
        {
          "name": "Customize",
          "text": "Choose colors and styles for your QR code."
        },
        {
          "name": "Download",
          "text": "Download the image for print or digital use."
        }
      ]
    }
  },
  "sms-qr-code": {
    "id": "sms-qr-code",
    "name": "SMS QR Code Generator",
    "url": getPublicDomain() + "/sms-qr-code",
    "description": "Make an SMS QR code in seconds. Scanning opens a text with your number and message filled in. Free forever, no ads, no sign-up.",
    "seoTitle": "Free SMS QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free SMS QR Code Generator",
    "image": "/og/sms-qr-code.png",
    "imageAlt": "Preview of the SMS QR Code Generator tool",
    "features": [
      "Generate Pre-filled SMS",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["sms-qr-code"],
    "howTo": {
      "name": "How to Create an SMS QR Code",
      "description": "Generate a QR code that opens a drafted text message.",
      "steps": [
        {
          "name": "Enter Details",
          "text": "Fill in the recipient number and the message text."
        },
        {
          "name": "Customize",
          "text": "Select a pattern and color for your QR code."
        },
        {
          "name": "Download",
          "text": "Download the image and share it."
        }
      ]
    }
  },
  "social-qr-code": {
    "id": "social-qr-code",
    "name": "Social QR Code Generator",
    "url": getPublicDomain() + "/social-qr-code",
    "description": "Make a social media QR code in seconds. Opens your Instagram, X or TikTok profile. Free forever, no ads, no sign-up, and your handle stays in your browser.",
    "seoTitle": "Free Social Media QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free Social Media QR Code Generator",
    "image": "/og/social-qr-code.png",
    "imageAlt": "Preview of the Social QR Code Generator tool",
    "features": [
      "Generate Social Profile QR",
      "Instagram/Twitter/TikTok Links",
      "Secure Client-Side"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.SocialNetworkingApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["social-qr-code"],
    "howTo": {
      "name": "How to Create a Social QR Code",
      "description": "Generate a QR code that links directly to your social profile.",
      "steps": [
        {
          "name": "Select Platform & Handle",
          "text": "Choose the social platform and enter your username or handle."
        },
        {
          "name": "Customize",
          "text": "Design your QR code with unique styles and colors."
        },
        {
          "name": "Download & Share",
          "text": "Save the QR code and place it on your social graphics or packaging."
        }
      ]
    }
  },
  "bulk-csv-qr-code": {
    "id": "bulk-csv-qr-code",
    "name": "Bulk CSV Batch QR Code Generator",
    "url": getPublicDomain() + "/bulk-csv-qr-code",
    "description": "Generate bulk batch QR codes from CSV or TXT files directly in your browser. Download as ZIP archive.",
    "seoTitle": "Free Bulk CSV Batch QR Code Generator | Privacy First - QRCraftly",
    "image": "/og/bulk-csv-qr-code.png",
    "imageAlt": "Preview of Bulk CSV Batch QR Code Generator tool",
    "features": [
      "Batch CSV QR Generation",
      "ZIP Package Download",
      "Zero Network Privacy"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "howTo": {
      "name": "How to Generate Bulk QR Codes from a CSV File",
      "description": "Upload a CSV file, map payload and filename columns, and download generated QR codes as a ZIP package.",
      "steps": [
        {
          "name": "Upload File",
          "text": "Choose or drop your .csv or .txt file into the bulk CSV upload area."
        },
        {
          "name": "Map Columns",
          "text": "Select which CSV column contains the QR payload and which column specifies output filenames."
        },
        {
          "name": "Export ZIP Archive",
          "text": "Select PNG or SVG export format and click Generate ZIP Package to download your batch."
        }
      ]
    },
    "faqs": [
      {
        "question": "Is my CSV file uploaded to a server?",
        "answer": "No. Your CSV file is parsed and processed entirely inside your browser using client-side JavaScript. What you upload never leaves your device."
      },
      {
        "question": "What formats are supported for batch QR code export?",
        "answer": "You can export your batch QR codes in PNG raster or SVG vector format packaged inside a single downloadable ZIP archive."
      }
    ]
  },
  "text-qr-code": {
    "id": "text-qr-code",
    "name": "Text QR Code Generator",
    "url": getPublicDomain() + "/text-qr-code",
    "description": "Make a text QR code in seconds. Scanning shows your text as written. Free forever, no ads, no sign-up, and your text never leaves your browser.",
    "seoTitle": "Free Text QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free Text QR Code Generator",
    "image": "/og/text-qr-code.png",
    "imageAlt": "Preview of the Text QR Code Generator tool",
    "features": [
      "Convert Text to QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["text-qr-code"],
    "howTo": {
      "name": "How to Create a Text QR Code",
      "description": "Convert plain text into a scannable QR code.",
      "steps": [
        {
          "name": "Enter Text",
          "text": "Type or paste your text content into the input field."
        },
        {
          "name": "Customize",
          "text": "Adjust colors, patterns, and add a logo if desired."
        },
        {
          "name": "Download",
          "text": "Download your QR code in PNG, JPEG, or WebP format."
        }
      ]
    }
  },
  "vcard-qr-code": {
    "id": "vcard-qr-code",
    "name": "vCard QR Code Generator",
    "url": getPublicDomain() + "/vcard-qr-code",
    "description": "Make a vCard QR code in seconds. People save your contact with one scan. Free forever, no ads, no sign-up, and your details stay in your browser.",
    "seoTitle": "Free vCard QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free vCard QR Code Generator",
    "image": "/og/vcard-qr-code.png",
    "imageAlt": "Preview of the vCard QR Code Generator tool",
    "features": [
      "Generate vCard Contact QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.BusinessApplication,
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["vcard-qr-code"],
    "howTo": {
      "name": "How to Create a vCard QR Code",
      "description": "Create a digital business card that can be scanned to save contact info.",
      "steps": [
        {
          "name": "Enter Contact Info",
          "text": "Fill in your name, phone, email, and other contact details."
        },
        {
          "name": "Customize",
          "text": "Add your logo or choose colors to match your brand."
        },
        {
          "name": "Download",
          "text": "Download the QR code for your business cards."
        }
      ]
    }
  },
  "wifi-qr-code": {
    "id": "wifi-qr-code",
    "name": "WiFi QR Code Generator",
    "url": getPublicDomain() + "/wifi-qr-code",
    "description": "Make a Wi-Fi QR code in seconds. Guests join by scanning. Free forever, no ads, no sign-up, and your password never leaves your browser.",
    "seoTitle": "Free WiFi QR Code Generator: No Sign-up, Never Expires | QRCraftly",
    "heading": "Free WiFi QR Code Generator",
    "image": "/og/wifi-qr-code.png",
    "imageAlt": "Preview of the WiFi QR Code Generator tool",
    "features": [
      "Generate WiFi Access QR Codes",
      "WPA/WPA2 Support",
      "Hidden SSID Support"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "faqs": toolFaqs["wifi-qr-code"],
    "howTo": {
      "name": "How to Create a WiFi QR Code",
      "description": "Generate a QR code to share your WiFi network instantly.",
      "supply": [
        { "name": "WiFi Network Name (SSID)" },
        { "name": "WiFi Password" },
        { "name": "Encryption Type" }
      ],
      "steps": [
        {
          "name": "Enter Network Name",
          "text": "Input your WiFi SSID (Network Name) into the designated field."
        },
        {
          "name": "Enter Password",
          "text": "Enter your WiFi password. Your data remains local and secure."
        },
        {
          "name": "Select Encryption",
          "text": "Choose your network encryption type (WPA/WPA2 is most common)."
        },
        {
          "name": "Download or Share",
          "text": "Click 'Download' to save the QR code or scan it directly from the screen."
        }
      ]
    }
  },
  "file-transfer": {
    "id": "file-transfer",
    "name": "Animated QR File Transfer",
    "url": getPublicDomain() + "/file-transfer",
    "description": "Share files offline safely using multi-frame QR streams and recycled UI canvas. Optimized to prevent memory crashes on mobile browsers.",
    "seoTitle": "Offline Animated QR File Transfer | High-Performance - QRCraftly",
    "image": "/og/file-transfer.png",
    "imageAlt": "Preview of the High-Performance Animated QR File Transfer tool",
    "features": [
      "Offline File Sharing",
      "Sequential Slicing Worker",
      "Recycled Canvas UI"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.DeveloperApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.AsynchronousWebWorkerDiagnostics,
    "howTo": {
      "name": "How to Transfer Files via Animated QR Codes",
      "description": "Share files sequentially through QR code animations.",
      "steps": [
        {
          "name": "Select File",
          "text": "Select any file or use the high-load simulation button."
        },
        {
          "name": "Set Pacing",
          "text": "Adjust the speed and chunk size to fit your receiving camera."
        },
        {
          "name": "Scan Animation",
          "text": "Scan the animated QR code stream sequentially with the receiver device."
        }
      ]
    }
  },
  "arcade": {
    "id": "arcade",
    "name": "QR Arcade & Durability Lab",
    "url": getPublicDomain() + "/arcade",
    "description": "Stress-test your QR design in the browser: blast it in the Arcade Blaster or strike modules in the Damage Simulator while Reed-Solomon analytics and a real scanner report whether it still decodes.",
    "seoTitle": "QR Arcade & Durability Lab | Stress-Test QR Error Correction - QRCraftly",
    "image": "/og/arcade.png",
    "imageAlt": "QR Arcade & Durability Lab: blasting a QR code while a live scanner checks it",
    "features": [
      "Arcade Blaster with plasma bolts, a thermal laser and antimatter rockets",
      "Damage Simulator with precision strikes and artillery barrages",
      "4x4 micro-cell damage, particles and screen shake (calmed under reduced motion)",
      "Live Reed-Solomon health across interleaved blocks with a 20% finder damage alarm",
      "Real scanner verdict from BarcodeDetector or an off-thread Web Worker",
      "Tests your own generator design without sending it anywhere"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.AsynchronousWebWorkerDiagnostics,
    "howTo": {
      "name": "How to Stress-Test a QR Code in the QR Arcade",
      "description": "Damage a QR code on purpose and see how much it can lose before scanners fail.",
      "steps": [
        {
          "name": "Bring your design",
          "text": "Select Stress Test in Arcade under the generator preview, or open the Arcade and enter any text or URL."
        },
        {
          "name": "Choose a mode",
          "text": "Use Arcade Blaster to shoot the code apart, or Damage Simulator to strike exact modules and launch barrages."
        },
        {
          "name": "Watch both verdicts",
          "text": "The health bar tracks the Reed-Solomon budget and finder patterns; the live scanner shows whether a real decoder can still read the code."
        },
        {
          "name": "Rebuild and compare",
          "text": "Rebuild or heal the code, change the error correction level, and try again to compare how much damage each level survives."
        }
      ]
    },
    "faqs": [
      {
        "question": "Why does the code fail when a corner square is hit, even with budget left?",
        "answer": "Scanners use the three 7x7 finder patterns to locate the grid. Once more than 20% of one is destroyed, alignment fails regardless of the remaining error correction budget."
      },
      {
        "question": "What is the difference between the health bar and the live scanner?",
        "answer": "The health bar is an instant mathematical model of Reed-Solomon capacity across interleaved blocks. The live scanner actually decodes the damaged image with BarcodeDetector or a Web Worker, so it is empirical proof of readability."
      },
      {
        "question": "Is my QR content uploaded?",
        "answer": "No. The design is passed from the generator in memory only and every scan runs on your device. Nothing is stored, placed in the URL or sent over the network."
      },
      {
        "question": "What happened to Destroy the QR and the Damage Simulator game?",
        "answer": "Both games are now modes of the QR Arcade. The old /destroy-the-qr and /game addresses redirect to Arcade Blaster and Damage Simulator."
      }
    ]
  },
  "qr-code-scanner": {
    "id": "qr-code-scanner",
    "name": "QR Code Scanner",
    "url": getPublicDomain() + "/qr-code-scanner",
    "description": "Scan a QR code online with your camera, or from a photo or screenshot. No app, no sign-up, and nothing is uploaded: every code is read in your browser, with a safety check before any link opens.",
    "seoTitle": "QR Code Scanner Online: Scan from Camera or Image, Nothing Uploaded - QRCraftly",
    "heading": "QR Code Scanner",
    "image": "/og/qr-code-scanner.png",
    "imageAlt": "QRCraftly QR code scanner reading a code with the camera",
    "features": [
      "Scan with your camera, or from a photo or screenshot",
      "Paste a screenshot with Ctrl+V or drop an image anywhere on the scanner",
      "Shows the real address of a link before you open it, and blocks script links",
      "Readable summaries of WiFi, contact, event, phone and email codes",
      "Open any code in the generator to edit it and make your own",
      "Runs entirely in your browser: no uploads, no app, no account"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "howTo": {
      "name": "How to Scan a QR Code Online",
      "description": "Read a QR code with your camera or from an image, without installing an app.",
      "steps": [
        {
          "name": "Start the camera or choose an image",
          "text": "Press Start camera and allow camera access, or switch to Image and choose a photo or screenshot. You can also paste a screenshot or drop an image on the scanner."
        },
        {
          "name": "Point at the code",
          "text": "Hold the QR code inside the square. When it is read, the square locks onto the code and the result opens."
        },
        {
          "name": "Check the result",
          "text": "The scanner shows what the code holds and, for a link, the real web address it opens. Script links are blocked."
        },
        {
          "name": "Copy, open or edit",
          "text": "Copy the content, open the link, share it, or open it in the generator to make your own version."
        }
      ]
    },
    "faqs": [
      {
        "question": "Is my image or camera video uploaded?",
        "answer": "No. The camera video and any image you choose, paste or drop are read in your browser on your device. Nothing is sent to a server, and the camera turns off when you leave or a code is found."
      },
      {
        "question": "Do I need to install an app to scan a QR code?",
        "answer": "No. The scanner works in any modern browser on phones and computers. It uses the browser's built-in barcode reader where there is one, and a reader bundled with the page everywhere else."
      },
      {
        "question": "Can I scan a QR code from a screenshot?",
        "answer": "Yes. Choose the screenshot, paste it with Ctrl+V (Cmd+V on a Mac), use Paste image, or drop it on the scanner."
      },
      {
        "question": "How do I know a scanned link is safe?",
        "answer": "Before anything opens, the scanner shows the real address the link goes to, decodes international addresses and warns when letters from different alphabets are mixed to imitate a known site. Links that would run a script are blocked. A link only opens when you press Open link."
      },
      {
        "question": "Why does the browser ask for camera permission?",
        "answer": "The browser asks only after you press Start camera, never when the page loads. If you would rather not allow it, scan from an image instead."
      }
    ]
  },
  "qr-code-checker": landingEntry("qr-code-checker"),
  "mosaic-qr-code": landingEntry("mosaic-qr-code"),
  "qr-code-with-logo": landingEntry("qr-code-with-logo"),
  "google-review-qr-code": landingEntry("google-review-qr-code"),
  "menu-qr-code": landingEntry("menu-qr-code"),
  "instagram-qr-code": landingEntry("instagram-qr-code"),
  "whatsapp-qr-code": landingEntry("whatsapp-qr-code"),
  "pdf-qr-code": landingEntry("pdf-qr-code"),
  "security": {
    "id": "security",
    "name": "Security & Privacy",
    "url": getPublicDomain() + "/security",
    "description": "Detailed information on QRCraftly's security architecture, privacy-first processing, and HIPAA compliance alignment.",
    "seoTitle": "Security & Privacy - QRCraftly",
    "image": "/og/security.png",
    "imageAlt": "Security & Privacy Transparency Hub",
    "features": [
      "Zero-Server Data Processing",
      "Client-Side Web Crypto Encryption",
      "HIPAA & GDPR Alignment Architecture",
      "Vulnerability Disclosure Portal"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "howTo": {
      "name": "How to Verify Security and Privacy Settings",
      "description": "Review security transparency guidelines and report vulnerabilities.",
      "steps": [
        {
          "name": "Review Privacy Architecture",
          "text": "Inspect our zero-transit privacy framework and local browser execution model."
        },
        {
          "name": "Audit Open Source Code",
          "text": "Verify security implementations directly in our open-source codebase."
        },
        {
          "name": "Submit Vulnerability Reports",
          "text": "Report security findings through our secure disclosure portal."
        }
      ]
    },
    "faqs": [
      {
        "question": "Does QRCraftly store my QR code data on a server?",
        "answer": "No. Standard static QR codes are generated entirely client-side inside your browser without transmitting sensitive payload data to external servers."
      },
      {
        "question": "Is QRCraftly compliant with HIPAA and GDPR?",
        "answer": "Yes. Because data processing occurs locally on the client device without centralized data retention, QRCraftly aligns with strict GDPR and HIPAA privacy standards."
      }
    ]
  }
};

export const auxiliaryRegistry: Record<string, AuxiliaryContent> = {
  "acknowledgements": {
    "id": "acknowledgements",
    "name": "Open-Source Acknowledgements",
    "seoTitle": "Open-Source Acknowledgements and Licenses - QRCraftly",
    "description": "Every open-source package whose code QRCraftly sends to your browser, with its version and full license text.",
    "image": "/og/acknowledgements.png",
    "imageAlt": "Open-source acknowledgements - QRCraftly",
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty
  },
  "guides": {
    "id": "guides",
    "name": "QR Code Guides",
    "seoTitle": "QR Code Guides: Plain Answers With Sources - QRCraftly",
    "description": "Plain-language guides on why QR codes stop working, static versus dynamic codes and more, with sources. Free, ad-free and nothing tracked.",
    "image": "/og/guides.png",
    "imageAlt": "QR code guides - QRCraftly",
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty
  },
  "guides/why-qr-codes-stop-working": {
    "id": "guides/why-qr-codes-stop-working",
    "name": "Why your QR code stopped working (and how to make one that never will)",
    "seoTitle": "Why Your QR Code Stopped Working (and How to Fix It for Good) | QRCraftly",
    "description": "QR codes do not expire by themselves. Find out whether yours was switched off, points at a dead page or is just hard to scan, and how to make one that lasts.",
    "image": "/og/guides-why-qr-codes-stop-working.png",
    "imageAlt": "Why QR codes stop working - QRCraftly",
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty
  },
  "guides/static-vs-dynamic-qr-codes": {
    "id": "guides/static-vs-dynamic-qr-codes",
    "name": "Static vs dynamic QR codes: what you give up and what you pay",
    "seoTitle": "Static vs Dynamic QR Codes: What You Give Up and What You Pay | QRCraftly",
    "description": "A plain comparison of static and dynamic QR codes: editing, scan counts, cost, privacy and what happens if the provider disappears, with a way to keep both.",
    "image": "/og/guides-static-vs-dynamic-qr-codes.png",
    "imageAlt": "Static vs dynamic QR codes - QRCraftly",
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty
  },
  "file-transfer/receive": {
    "id": "file-transfer/receive",
    "name": "Offline Animated QR File Receiver",
    "seoTitle": "Offline Animated QR File Receiver | High-Performance - QRCraftly",
    "description": "Receive files offline safely using multi-frame QR streams and camera capture. Optimized with lookahead packet recovery.",
    "image": "/og/file-transfer-receive.png",
    "imageAlt": "Preview of the High-Performance Animated QR File Receiver",
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty
  },
  "_error": {
    "id": "_error",
    "name": "404 Page Not Found",
    "seoTitle": "404 Page Not Found - QRCraftly",
    "description": "The page you are looking for does not exist.",
    "image": "/og-image.png",
    "imageAlt": "404 Page Not Found - QRCraftly",
    "personas": [TargetPersona.HealthcareLegal],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty
  }
};

/**
 * A retired route kept only as a redirect to its canonical replacement.
 */
export interface LegacyRouteContent extends AuxiliaryContent {
  /** Where visitors are redirected (path and query only, never payload content). */
  redirectTo: string;
  /** Canonical path search engines should index instead. */
  canonicalPath: string;
}

/**
 * Retired routes. They are excluded from the sitemap and audits, marked noindex, and point
 * their canonical link at the replacement.
 */
export const legacyRouteRegistry: Record<string, LegacyRouteContent> = {
  "destroy-the-qr": {
    "id": "destroy-the-qr",
    "name": "Destroy the QR (moved to QR Arcade)",
    "seoTitle": "Destroy the QR is now QR Arcade Blaster - QRCraftly",
    "description": "Destroy the QR is now the Arcade Blaster mode of the QR Arcade & Durability Lab.",
    "image": "/og-image.png?type=arcade",
    "imageAlt": "QR Arcade & Durability Lab",
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.AsynchronousWebWorkerDiagnostics,
    "redirectTo": "/arcade?mode=blaster",
    "canonicalPath": "/arcade"
  },
  "game": {
    "id": "game",
    "name": "QR Damage Simulator (moved to QR Arcade)",
    "seoTitle": "The QR Damage Simulator is now part of QR Arcade - QRCraftly",
    "description": "The QR Damage Simulator game is now the Damage Simulator mode of the QR Arcade & Durability Lab.",
    "image": "/og-image.png?type=arcade",
    "imageAlt": "QR Arcade & Durability Lab",
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.AsynchronousWebWorkerDiagnostics,
    "redirectTo": "/arcade?mode=simulator",
    "canonicalPath": "/arcade"
  }
};

const getRegistryKeyForPath = (path: string): string => {
  let cleanPath = getSanitizedPath(path);
  if (cleanPath !== "/" && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }
  if (cleanPath === "" || cleanPath === "/") {
    return "index";
  }
  const pathLookup = cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath;
  return pathLookup;
};

export function getContentById(id: string): ToolContent | AuxiliaryContent | undefined {
  return contentRegistry[id] || auxiliaryRegistry[id] || legacyRouteRegistry[id];
}

export function getContentForPath(path: string): ToolContent | AuxiliaryContent | undefined {
  const key = getRegistryKeyForPath(path);
  return contentRegistry[key] || auxiliaryRegistry[key] || legacyRouteRegistry[key];
}

/**
 * Looks up a retired route.
 * @param path - A pathname.
 * @returns Its redirect entry, or undefined for live routes.
 */
export function getLegacyRedirect(path: string): LegacyRouteContent | undefined {
  return legacyRouteRegistry[getRegistryKeyForPath(path)];
}

export function getMetadataForPath(path: string): { title: string; description: string; image: string; imageAlt: string } {
  const pathLookup = getRegistryKeyForPath(path);

  if (contentRegistry[pathLookup]) {
    const item = contentRegistry[pathLookup];
    return {
      title: item.seoTitle || item.name,
      description: item.description,
      image: item.image || item.ogImage || '/og-image.png',
      imageAlt: item.imageAlt || item.ogImageAlt || item.seoTitle || item.name,
    };
  }
  
  if (auxiliaryRegistry[pathLookup] || legacyRouteRegistry[pathLookup]) {
    const item = auxiliaryRegistry[pathLookup] || legacyRouteRegistry[pathLookup];
    return {
      title: item.seoTitle,
      description: item.description,
      image: item.image || item.ogImage || '/og-image.png',
      imageAlt: item.imageAlt || item.ogImageAlt || item.seoTitle,
    };
  }

  return {
    title: "QRCraftly - Free Custom QR Code Generator",
    description: "Generate beautiful, custom QR codes for free. No sign-up required.",
    image: "/og-image.png",
    imageAlt: "QRCraftly QR Code Example",
  };
}

/**
 * Minimal page-context shape needed to resolve metadata.
 */
export interface MetadataPageContext {
  /** The requested path. */
  urlPathname: string;
  /** Whether this render is the 404 page. */
  is404?: boolean | null;
  /** Status code of an aborted render, if any. */
  abortStatusCode?: number;
}

/**
 * Resolves metadata for a rendered page. The 404 page uses the
 * dedicated `_error` entry instead of inheriting the homepage fallback for an unknown URL.
 * @param pageContext - The Vike page context.
 * @returns Title, description and image metadata.
 */
export function getMetadataForPageContext(pageContext: MetadataPageContext): ReturnType<typeof getMetadataForPath> {
  const isError = Boolean(pageContext.is404) || pageContext.abortStatusCode === 404;
  return getMetadataForPath(isError ? '/_error' : pageContext.urlPathname);
}
