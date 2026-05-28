
export const toolMetadata = {
  'about': {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "name": "About QRCraftly",
        "url": "https://qrcraftly.com/about",
        "mainEntity": {
          "@type": "Organization",
          "@id": "https://qrcraftly.com/#organization",
          "name": "QRCraftly",
          "description": "Privacy-focused, client-side QR code generator.",
          "slogan": "Free. Secure. Open Source.",
          "foundingDate": "2025"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is QRCraftly free?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "QRCraftly is completely free to use. No sign-up, no login, and no hidden fees. Just generate your QR codes instantly."
            }
          },
          {
            "@type": "Question",
            "name": "Does QRCraftly track users?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We do not use tracking pixels, cookies, or third-party analytics. We only collect basic server logs for performance and reliability."
            }
          },
          {
            "@type": "Question",
            "name": "Is my data secure?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We utilize a Zero Knowledge architecture. Your content is processed entirely in your browser and never transmitted to our servers."
            }
          },
          {
            "@type": "Question",
            "name": "Is QRCraftly open source?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Our code is open for inspection and contribution. We believe in transparency."
            }
          }
        ]
      }
    ]
  },
  'email-qr-code': {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Email QR Code Generator",
        "url": "https://qrcraftly.com/email-qr-code",
        "applicationCategory": "Utilities",
        "operatingSystem": "All",
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@id": "https://qrcraftly.com/#organization"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": "Generate Pre-filled Emails, Secure Client-Side, Custom Design"
      },
      {
        "@type": "HowTo",
        "name": "How to Create an Email QR Code",
        "description": "Generate a QR code that opens a drafted email.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly Email Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Details",
            "text": "Fill in the recipient, subject, and body of the email."
          },
          {
            "@type": "HowToStep",
            "name": "Customize",
            "text": "Choose a style and color for your QR code."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Save the QR code and print it on business cards or flyers."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is it free to generate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, our tool is 100% free with no hidden fees."
            }
          },
          {
            "@type": "Question",
            "name": "Do QR codes expire?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No, standard static QR codes do not expire."
            }
          }
        ]
      }
    ]
  },
  'index': {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "QRCraftly",
        "url": "https://qrcraftly.com",
        "applicationCategory": "Utilities",
        "operatingSystem": "All",
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@id": "https://qrcraftly.com/#organization"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": "Custom QR Codes, WiFi QR Codes, vCard, Secure Client-Side Generation, Artistic Styles"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a URL QR Code",
        "description": "Convert any website URL into a scannable QR code instantly.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly URL Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter URL",
            "text": "Paste your website address (URL) into the input field."
          },
          {
            "@type": "HowToStep",
            "name": "Customize Design",
            "text": "Adjust colors, add a logo, or change the pattern style."
          },
          {
            "@type": "HowToStep",
            "name": "Download QR Code",
            "text": "Save your custom QR code in PNG, JPEG, or WebP format."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is it free to generate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, our tool is 100% free with no hidden fees."
            }
          },
          {
            "@type": "Question",
            "name": "Do QR codes expire?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No, standard static QR codes do not expire."
            }
          }
        ]
      }
    ]
  },
  'payment-qr-code': {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Payment QR Code Generator",
        "url": "https://qrcraftly.com/payment-qr-code",
        "applicationCategory": "Utilities",
        "operatingSystem": "All",
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@id": "https://qrcraftly.com/#organization"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": "Generate Crypto Payment QR, Bitcoin/Ethereum Support, Secure Client-Side"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a Payment QR Code",
        "description": "Generate a QR code to receive cryptocurrency payments.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly Payment Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Select Network",
            "text": "Choose the cryptocurrency network (e.g., Bitcoin, Ethereum)."
          },
          {
            "@type": "HowToStep",
            "name": "Enter Address",
            "text": "Paste your wallet address and optional amount."
          },
          {
            "@type": "HowToStep",
            "name": "Customize & Download",
            "text": "Style your QR code and save it."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is it free to generate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, our tool is 100% free with no hidden fees."
            }
          },
          {
            "@type": "Question",
            "name": "Do QR codes expire?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No, standard static QR codes do not expire."
            }
          }
        ]
      }
    ]
  },
  'phone-qr-code': {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Phone QR Code Generator",
        "url": "https://qrcraftly.com/phone-qr-code",
        "applicationCategory": "Utilities",
        "operatingSystem": "All",
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@id": "https://qrcraftly.com/#organization"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": "Generate Click-to-Call QR, Secure Client-Side, Custom Design"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a Phone QR Code",
        "description": "Create a QR code that prompts the user to dial a number.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly Phone Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Number",
            "text": "Input the phone number you want people to call."
          },
          {
            "@type": "HowToStep",
            "name": "Customize",
            "text": "Choose colors and styles for your QR code."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Download the image for print or digital use."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is it free to generate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, our tool is 100% free with no hidden fees."
            }
          },
          {
            "@type": "Question",
            "name": "Do QR codes expire?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No, standard static QR codes do not expire."
            }
          }
        ]
      }
    ]
  },
  'sms-qr-code': {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "SMS QR Code Generator",
        "url": "https://qrcraftly.com/sms-qr-code",
        "applicationCategory": "Utilities",
        "operatingSystem": "All",
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@id": "https://qrcraftly.com/#organization"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": "Generate Pre-filled SMS, Secure Client-Side, Custom Design"
      },
      {
        "@type": "HowTo",
        "name": "How to Create an SMS QR Code",
        "description": "Generate a QR code that opens a drafted text message.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly SMS Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Details",
            "text": "Fill in the recipient number and the message text."
          },
          {
            "@type": "HowToStep",
            "name": "Customize",
            "text": "Select a pattern and color for your QR code."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Download the image and share it."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is it free to generate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, our tool is 100% free with no hidden fees."
            }
          },
          {
            "@type": "Question",
            "name": "Do QR codes expire?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No, standard static QR codes do not expire."
            }
          }
        ]
      }
    ]
  },
  'text-qr-code': {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Text QR Code Generator",
        "url": "https://qrcraftly.com/text-qr-code",
        "applicationCategory": "Utilities",
        "operatingSystem": "All",
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@id": "https://qrcraftly.com/#organization"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": "Convert Text to QR, Secure Client-Side, Custom Design"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a Text QR Code",
        "description": "Convert plain text into a scannable QR code.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly Text Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Text",
            "text": "Type or paste your text content into the input field."
          },
          {
            "@type": "HowToStep",
            "name": "Customize",
            "text": "Adjust colors, patterns, and add a logo if desired."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Download your QR code in PNG, JPEG, or WebP format."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is it free to generate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, our tool is 100% free with no hidden fees."
            }
          },
          {
            "@type": "Question",
            "name": "Do QR codes expire?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No, standard static QR codes do not expire."
            }
          }
        ]
      }
    ]
  },
  'vcard-qr-code': {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "VCard QR Code Generator",
        "url": "https://qrcraftly.com/vcard-qr-code",
        "applicationCategory": "Utilities",
        "operatingSystem": "All",
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@id": "https://qrcraftly.com/#organization"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": "Generate VCard Contact QR, Secure Client-Side, Custom Design"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a VCard QR Code",
        "description": "Create a digital business card that can be scanned to save contact info.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly VCard Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Contact Info",
            "text": "Fill in your name, phone, email, and other contact details."
          },
          {
            "@type": "HowToStep",
            "name": "Customize",
            "text": "Add your logo or choose colors to match your brand."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Download the QR code for your business cards."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is it free to generate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, our tool is 100% free with no hidden fees."
            }
          },
          {
            "@type": "Question",
            "name": "Do QR codes expire?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No, standard static QR codes do not expire."
            }
          }
        ]
      }
    ]
  },
  'wifi-qr-code': {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "WiFi QR Code Generator",
        "url": "https://qrcraftly.com/wifi-qr-code",
        "applicationCategory": "Utilities",
        "operatingSystem": "All",
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@id": "https://qrcraftly.com/#organization"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": "Generate WiFi Access QR Codes, WPA/WPA2 Support, Hidden SSID Support"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a WiFi QR Code",
        "description": "Generate a QR code to share your WiFi network instantly.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "supply": [
          {
            "@type": "HowToSupply",
            "name": "WiFi Network Name (SSID)"
          },
          {
            "@type": "HowToSupply",
            "name": "WiFi Password"
          },
          {
            "@type": "HowToSupply",
            "name": "Encryption Type"
          }
        ],
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly WiFi Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Network Name",
            "text": "Input your WiFi SSID (Network Name) into the designated field."
          },
          {
            "@type": "HowToStep",
            "name": "Enter Password",
            "text": "Enter your WiFi password. Your data remains local and secure."
          },
          {
            "@type": "HowToStep",
            "name": "Select Encryption",
            "text": "Choose your network encryption type (WPA/WPA2 is most common)."
          },
          {
            "@type": "HowToStep",
            "name": "Download or Share",
            "text": "Click 'Download' to save the QR code or scan it directly from the screen."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is it free to generate?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, our tool is 100% free with no hidden fees."
            }
          },
          {
            "@type": "Question",
            "name": "Do QR codes expire?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No, standard static QR codes do not expire."
            }
          }
        ]
      }
    ]
  },
};
