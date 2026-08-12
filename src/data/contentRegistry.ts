import { getPublicDomain } from "../utils/metadataEngine";

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
  Developer = "Developer",
  Marketer = "Marketer",
  BusinessOwner = "Business Owner",
  GeneralUser = "General User",
  Professional = "Professional"
}

export enum StrategicValueCategory {
  BusinessUtility = "Business Utility",
  DeveloperTool = "Developer Tool",
  MarketingCampaign = "Marketing Campaign",
  PersonalUse = "Personal Use",
  SocialSharing = "Social Sharing"
}

export interface ToolContent {
  id: string;
  name: string;
  url: string;
  description: string;
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

export const contentRegistry: Record<string, ToolContent> = {
  "about": {
    "id": "about",
    "name": "About QRCraftly",
    "url": getPublicDomain() + "/about",
    "description": "Privacy-focused, client-side QR code generator.",
    "features": [],
    "schemaType": SchemaType.AboutPage,
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.GeneralUser],
    "valueProposition": StrategicValueCategory.PersonalUse,
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
    "description": "",
    "features": [
      "Generate Pre-filled Emails",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.Marketer, TargetPersona.BusinessOwner],
    "valueProposition": StrategicValueCategory.MarketingCampaign,
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
    "description": "Create QR codes that save calendar events. Set title, date, location, and description. Ideal for invitations, RSVP, and scheduling.",
    "features": [
      "Generate Calendar Event QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.Marketer, TargetPersona.Professional],
    "valueProposition": StrategicValueCategory.SocialSharing,
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
    "description": "",
    "features": [
      "Custom QR Codes",
      "WiFi QR Codes",
      "vCard",
      "Secure Client-Side Generation",
      "Artistic Styles"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.GeneralUser],
    "valueProposition": StrategicValueCategory.PersonalUse,
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
    "description": "Create QR codes that open maps and geographical locations. Set latitude and longitude. Ideal for navigation and sharing venue coordinates.",
    "features": [
      "Generate Location QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.GeneralUser, TargetPersona.BusinessOwner],
    "valueProposition": StrategicValueCategory.BusinessUtility,
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
    "description": "Create QR codes that open virtual meeting invitations. Set the direct join URL. Compatible with Zoom, Teams, and Google Meet.",
    "features": [
      "Generate Virtual Meeting QR",
      "Zoom/Teams/Meet Support",
      "Secure Client-Side"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.Professional, TargetPersona.BusinessOwner],
    "valueProposition": StrategicValueCategory.BusinessUtility,
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
    "description": "",
    "features": [
      "Generate Crypto Payment QR",
      "Bitcoin/Ethereum Support",
      "Secure Client-Side"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.BusinessApplication,
    "personas": [TargetPersona.BusinessOwner, TargetPersona.Developer],
    "valueProposition": StrategicValueCategory.BusinessUtility,
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
    "description": "",
    "features": [
      "Generate Click-to-Call QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.GeneralUser, TargetPersona.BusinessOwner],
    "valueProposition": StrategicValueCategory.BusinessUtility,
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
    "description": "",
    "features": [
      "Generate Pre-filled SMS",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.Marketer, TargetPersona.BusinessOwner],
    "valueProposition": StrategicValueCategory.MarketingCampaign,
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
    "description": "Create QR codes that link directly to social media profiles. Set your platform and handle. Ideal for Instagram, Twitter, and TikTok.",
    "features": [
      "Generate Social Profile QR",
      "Instagram/Twitter/TikTok Links",
      "Secure Client-Side"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.SocialNetworkingApplication,
    "personas": [TargetPersona.Marketer, TargetPersona.GeneralUser],
    "valueProposition": StrategicValueCategory.SocialSharing,
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
    "description": "",
    "features": [
      "Convert Text to QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.GeneralUser, TargetPersona.Developer],
    "valueProposition": StrategicValueCategory.PersonalUse,
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
    "description": "",
    "features": [
      "Generate VCard Contact QR",
      "Secure Client-Side",
      "Custom Design"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.BusinessApplication,
    "personas": [TargetPersona.Professional, TargetPersona.BusinessOwner],
    "valueProposition": StrategicValueCategory.BusinessUtility,
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
    "description": "",
    "features": [
      "Generate WiFi Access QR Codes",
      "WPA/WPA2 Support",
      "Hidden SSID Support"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.UtilitiesApplication,
    "personas": [TargetPersona.GeneralUser, TargetPersona.BusinessOwner],
    "valueProposition": StrategicValueCategory.PersonalUse,
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
    "description": "High-capacity offline file sharing via animated QR code streams using a recycled UI canvas.",
    "features": [
      "Offline File Streaming",
      "Sequential Slicing Worker",
      "Recycled Canvas UI"
    ],
    "schemaType": [SchemaType.SoftwareApplication, SchemaType.WebApplication],
    "schemaCategory": SchemaCategory.DeveloperApplication,
    "personas": [TargetPersona.Developer, TargetPersona.Professional],
    "valueProposition": StrategicValueCategory.DeveloperTool,
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
