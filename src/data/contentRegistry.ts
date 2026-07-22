import { getPublicDomain } from "../utils/metadataEngine";
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
}

export const contentRegistry: Record<string, ToolContent> = {
  "about": {
    "id": "about",
    "name": "About QRCraftly",
    "url": getPublicDomain() + "/about",
    "description": "Privacy-focused, client-side QR code generator.",
    "features": [],
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
  }
};
