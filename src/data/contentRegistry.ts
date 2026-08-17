import { getPublicDomain, getSanitizedPath } from "../utils/metadataEngine";

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

interface AuxiliaryContent {
  id: string;
  name: string;
  seoTitle: string;
  description: string;
}

export const contentRegistry: Record<string, ToolContent> = {
  "about": {
    "id": "about",
    "name": "About QRCraftly",
    "url": getPublicDomain() + "/about",
    "description": "Learn about QRCraftly's mission to provide a free, secure, and open-source QR code generator with privacy-first architecture.",
    "seoTitle": "About QRCraftly - Privacy & Open Source",
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
        "question": "Does QRCraftly track users?",
        "answer": "We do not use tracking pixels, cookies, or third-party analytics. We only collect basic server logs for performance and reliability."
      },
      {
        "question": "Is my data secure?",
        "answer": "We utilize a Privacy First architecture. Your content is processed entirely in your browser and not transmitted to our servers without your explicit opt-in for telemetry."
      },
      {
        "question": "Is QRCraftly open source?",
        "answer": "Our code is open for inspection and contribution. We believe in transparency."
      }
    ]
  },
  "email-qr-code": {
    "id": "email-qr-code",
    "name": "Email QR Code Generator",
    "url": getPublicDomain() + "/email-qr-code",
    "description": "Create QR codes that open a pre-filled email. Set recipient, subject, and body. Ideal for feedback, support, or contact.",
    "seoTitle": "Free Email QR Code Generator | Pre-filled Emails - QRCraftly",
    "features": [
      "Generate Pre-filled Emails",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
    "description": "Generate Event QR codes to save calendar events instantly. Set your event title, date, location, and details. Fast, free, and secure.",
    "seoTitle": "Free Event QR Code Generator | Save Calendar Events - QRCraftly",
    "features": [
      "Generate Calendar Event QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
    "description": "Generate beautiful, custom QR codes for free. No sign-up required. Secure, client-side generation.",
    "seoTitle": "QRCraftly - Free Custom QR Code Generator",
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
          "text": "Save your custom QR code in PNG, JPEG, or WebP format."
        }
      ]
    },
    "faqs": [
      {
        "question": "Is it free to generate?",
        "answer": "Yes, our tool is 100% free with no hidden fees."
      },
      {
        "question": "Do QR codes expire?",
        "answer": "No, standard static QR codes do not expire."
      }
    ]
  },
  "location-qr-code": {
    "id": "location-qr-code",
    "name": "Location QR Code Generator",
    "url": getPublicDomain() + "/location-qr-code",
    "description": "Create QR codes for geographical map coordinates. Set latitude and longitude for easy physical navigation. Fast, free, and secure.",
    "seoTitle": "Free Location QR Code Generator | Map Coordinates - QRCraftly",
    "features": [
      "Generate Location QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
    "description": "Generate QR codes for virtual meetings. Paste meeting join links for Zoom, Microsoft Teams, and Google Meet. Fast, free, and secure.",
    "seoTitle": "Free Virtual Meeting QR Code Generator | Zoom & Teams - QRCraftly",
    "features": [
      "Generate Virtual Meeting QR",
      "Zoom/Teams/Meet Support",
      "Secure Client-Side"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
    "description": "Create secure crypto payment QR codes for Bitcoin, Ethereum, Solana, and more. Accept payments easily.",
    "seoTitle": "Free Crypto Payment QR Code Generator | Bitcoin, Ethereum - QRCraftly",
    "features": [
      "Generate Crypto Payment QR",
      "Bitcoin/Ethereum Support",
      "Secure Client-Side"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.BusinessApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
    "description": "Create QR codes that dial a phone number when scanned. Ideal for business cards, flyers, and advertisements.",
    "seoTitle": "Free Phone QR Code Generator | Click-to-Call - QRCraftly",
    "features": [
      "Generate Click-to-Call QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
    "description": "Generate QR codes that open a pre-filled SMS message. Set recipient and message body. Perfect for opt-ins and support.",
    "seoTitle": "Free SMS QR Code Generator | Pre-filled Text Messages - QRCraftly",
    "features": [
      "Generate Pre-filled SMS",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
    "description": "Create QR codes linking directly to your social media profiles on Instagram, Twitter, or TikTok. Fast, free, and secure.",
    "seoTitle": "Free Social Media QR Code Generator | Connect Profiles - QRCraftly",
    "features": [
      "Generate Social Profile QR",
      "Instagram/Twitter/TikTok Links",
      "Secure Client-Side"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.SocialNetworkingApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
  "text-qr-code": {
    "id": "text-qr-code",
    "name": "Text QR Code Generator",
    "url": getPublicDomain() + "/text-qr-code",
    "description": "Convert any text into a QR code instantly. Free, secure, and customizable. Perfect for sharing messages, notes, or codes.",
    "seoTitle": "Free Text QR Code Generator | Convert Text to QR - QRCraftly",
    "features": [
      "Convert Text to QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
    "name": "VCard QR Code Generator",
    "url": getPublicDomain() + "/vcard-qr-code",
    "description": "Generate VCard QR codes for digital business cards. Share contact details easily. Compatible with all smartphones.",
    "seoTitle": "Free VCard QR Code Generator | Digital Business Cards - QRCraftly",
    "features": [
      "Generate VCard Contact QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.BusinessApplication,
    "personas": [TargetPersona.HealthcareLegal, TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
    "howTo": {
      "name": "How to Create a VCard QR Code",
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
    "description": "Create a QR code for your WiFi network. Allow guests to connect instantly without typing passwords. Secure and free.",
    "seoTitle": "Free WiFi QR Code Generator | Connect Without Password - QRCraftly",
    "features": [
      "Generate WiFi Access QR Codes",
      "WPA/WPA2 Support",
      "Hidden SSID Support"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.SecurityConsciousEnterprise],
    "valueProposition": StrategicValueCategory.ZeroTransitPrivacySovereignty,
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
  }
};

const auxiliaryRegistry: Record<string, AuxiliaryContent> = {
  "dynamic-dashboard": {
    "id": "dynamic-dashboard",
    "name": "Dynamic Redirection Dashboard",
    "seoTitle": "Dynamic Redirection Dashboard - QRCraftly",
    "description": "Manage your dynamic QR destinations, update target URLs, and view cumulative scan statistics in real-time."
  },
  "audio-qr": {
    "id": "audio-qr",
    "name": "Audio QR & Acoustic Steganography",
    "seoTitle": "Acoustic Steganography & Audio QR | Convert Data to Sound - QRCraftly",
    "description": "Convert data into audible sound chirps or generate a spectrogram audio file that visualizes as a scannable QR code using the Web Audio API."
  },
  "destroy-the-qr": {
    "id": "destroy-the-qr",
    "name": "Destroy the QR!",
    "seoTitle": "Destroy the QR! - Interactive Mini-Game",
    "description": "An interactive 60 FPS mini-game to test the durability of your QR codes in real-time with lasers and explosions."
  },
  "game": {
    "id": "game",
    "name": "QR Damage Simulator Game",
    "seoTitle": "QR Damage Simulator Game | Interactive Gameplay - QRCraftly",
    "description": "Play and damage QR codes in real-time. Map damage to coordinates and test error-correction health bars with smooth 60fps play."
  },
  "security": {
    "id": "security",
    "name": "Security & Privacy",
    "seoTitle": "Security & Privacy - QRCraftly",
    "description": "Detailed information on QRCraftly's security architecture, privacy-first processing, and HIPAA compliance alignment."
  },
  "file-transfer/receive": {
    "id": "file-transfer/receive",
    "name": "Offline Animated QR File Receiver",
    "seoTitle": "Offline Animated QR File Receiver | High-Performance - QRCraftly",
    "description": "Receive files offline safely using multi-frame QR streams and camera capture. Optimized with lookahead packet recovery."
  },
  "_error": {
    "id": "_error",
    "name": "404 Page Not Found",
    "seoTitle": "404 Page Not Found - QRCraftly",
    "description": "The page you are looking for does not exist."
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

export function getMetadataForPath(path: string): { title: string; description: string } {
  const pathLookup = getRegistryKeyForPath(path);
  
  if (contentRegistry[pathLookup]) {
    return {
      title: contentRegistry[pathLookup].seoTitle || contentRegistry[pathLookup].name,
      description: contentRegistry[pathLookup].description,
    };
  }
  
  if (auxiliaryRegistry[pathLookup]) {
    return {
      title: auxiliaryRegistry[pathLookup].seoTitle,
      description: auxiliaryRegistry[pathLookup].description,
    };
  }

  return {
    title: "QRCraftly - Free Custom QR Code Generator",
    description: "Generate beautiful, custom QR codes for free. No sign-up required.",
  };
}
