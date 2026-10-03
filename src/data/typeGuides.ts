/*
    QRCraftly
    Copyright (C) 2026 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/** The long-form sections of a generator page, below the tool (#1029). */
export interface TypeGuide {
  /** Opening paragraph, 40 to 60 words: what the generator makes, and the no-ads pledge in one line. */
  intro: string;
  /** What a phone does when it scans the code. */
  scanned: string[];
  /** Real situations for this kind of code. */
  useCases: string[];
  /** Printing and sharing advice specific to this kind of code. */
  printing: string[];
  /** Things to check before sharing the code, specific to this type. */
  checks: string[];
  /** Where the typed data goes, in this type's own terms. */
  privacy: string;
}

export const typeGuides: Record<string, TypeGuide> = {
  'wifi-qr-code': {
    intro:
      'Turn your network name and password into a QR code that guests scan to join your Wi-Fi without typing a thing. It is free, with no sign-up and no ads, and your password is encoded in your browser and never sent anywhere.',
    scanned: [
      'On an iPhone, the Camera app reads the code and offers to join the network (iOS 11 and later). On Android 10 and later, the camera app or Google Lens offers the same, and Settings has a scan option in the Wi-Fi screen.',
      'Older Android phones may need a scanner app that understands Wi-Fi codes. Laptops generally cannot join from a code, so give them the password the usual way.',
      'After joining, the phone saves the network like any other, so people can reconnect later without scanning again.',
    ],
    useCases: [
      'A guest network card in a rental, bed and breakfast or Airbnb.',
      'A framed code at the front desk of a café, salon or waiting room.',
      'An office or meeting room, so visitors stop asking for the password.',
      'A family fridge magnet for relatives and friends who visit.',
      'A conference or workshop badge insert for the event network.',
    ],
    printing: [
      'Print it at least 2 cm (about 0.8 in) square, and larger if it will be read from across a counter.',
      'Keep dark modules on a light background and leave the blank border around the code intact.',
      'Test it with one iPhone and one Android phone before you print a batch.',
      'If you change the password, the code stops working. Make a new one and replace the old print.',
    ],
    checks: [
      'Type the network name exactly, including capitals and spaces. A mismatch makes the phone try to join a network that does not exist.',
      'Pick the security type your router actually uses. WPA or WPA2 covers most home and office routers, and an open network needs no password at all.',
      'Tick the hidden network option only if the router does not broadcast its name, since otherwise phones may hesitate on a code that says it is hidden.',
      'If you run separate guest and staff networks, make a code for each and label them clearly, so visitors never end up on the wrong one.',
    ],
    privacy:
      'The name and password are put into the QR code in your browser. Nothing is uploaded, stored or logged by QRCraftly. The password is readable by anyone who scans the code, so use a guest network and not the one your own devices share.',
  },
  'vcard-qr-code': {
    intro:
      'Put your contact details in a QR code that saves straight into a phone’s address book. Add your name, number, email, company and website, then download it for a business card or email signature. Free, no sign-up, no ads, and nothing leaves your browser.',
    scanned: [
      'On an iPhone, the Camera app recognises a contact card and offers to create a new contact. On Android, the camera app or Google Lens offers an add-contact action. The person can review the fields before saving.',
      'Because the card is stored in the code itself, it works with no internet connection at the moment of scanning.',
      'A saved contact is a copy. If your details change later, people who already scanned keep the old version until they update it, which is why a link to a page you control is useful.',
    ],
    useCases: [
      'The back of a business card, instead of a long list of fields.',
      'A name badge at a conference or trade show.',
      'An email signature or a slide at the end of a talk.',
      'A real estate sign, a shop window or a food truck.',
      'A resume, so a recruiter can save your details in one scan.',
    ],
    printing: [
      'Every extra field makes the code denser. For small print, keep to a name, a phone, an email and one link.',
      'On a business card, make the code at least 2 cm (about 0.8 in) square.',
      'Check the code on a second phone after printing, because dense codes are the first to fail on glossy stock.',
      'Details are fixed when you make the code. If a phone number or job title changes, make a new code.',
    ],
    checks: [
      'Write the phone number with its country code, so it dials correctly for someone saving your card from another country.',
      'Add a website you keep up to date. It is the one field that can send people to fresh information when the rest goes stale.',
      'Scan your own code and open the saved contact, to confirm the name, number and email landed in the right fields.',
      'Keep the company and job title short. Long values wrap awkwardly on small contact screens and add to the size of the code.',
    ],
    privacy:
      'Your name, number, email and address are written into the code in your browser. QRCraftly never receives them. Anyone can read what is in a printed code, so only include details you are happy to hand to everyone who sees it.',
  },
  'email-qr-code': {
    intro:
      'Make a QR code that opens a new email already addressed, with a subject and message ready to go. Good for feedback, support and bookings. It is free forever, with no sign-up and no ads, and the address and text you type stay in your browser.',
    scanned: [
      'Scanning opens the phone’s default email app with the recipient, subject and body filled in. The person still has to press send, so nothing is sent without them.',
      'On iPhone and Android alike, which app opens depends on the default mail app the person has chosen. If none is set up, the phone usually asks them to add an account.',
      'The code does not send anything or reveal who scanned it. Your first sign of a scan is the email that arrives, and only if the person decides to write it.',
    ],
    useCases: [
      'A feedback email on a receipt, table card or product box.',
      'A support address on a device, manual or warranty card.',
      'A booking or enquiry request on a poster or flyer.',
      'A “report a problem” link on a notice in a shared space.',
      'A press or partnership contact on a leaflet.',
    ],
    printing: [
      'Keep the subject and message short. Long prefilled text produces a dense code that is harder to scan.',
      'Use a role address such as hello@ or support@ instead of a personal one, because a printed code cannot be edited later.',
      'Print at 2 cm (about 0.8 in) or larger, with plain dark ink on a light background.',
      'Scan the printed code once and send yourself the email to make sure the fields arrive as intended.',
    ],
    checks: [
      'Type the address twice and read it back. A single wrong letter sends every message to someone else.',
      'Write a clear subject, such as “Feedback on table 4”, so the replies are easy to sort when they arrive.',
      'Say in the body what you want the person to write, for example “Tell us what we could do better”, then leave room for them to answer.',
      'Test the code with the mail app you use yourself and with a webmail app. Most prefilled fields carry through, but some apps trim long bodies.',
    ],
    privacy:
      'The address, subject and body are put into the code in your browser, and QRCraftly never sees them. Anyone who scans a printed code can read the address, so avoid putting a private inbox on public material.',
  },
  'sms-qr-code': {
    intro:
      'Create a QR code that opens a text message with the number and the words already filled in. People scan, check and tap send. It is free, with no sign-up and no ads, and the number and message you enter never leave your browser.',
    scanned: [
      'The phone opens its messaging app with the number in the “to” field and your message in the text box. The person still taps send, so the message is only sent if they choose to.',
      'This works on iPhone and Android. Standard text-message rates from their carrier apply to the person who sends it.',
      'The reply goes to whichever number the person texts from. If you use a shared or automated number, check that it can see the incoming message and who sent it.',
    ],
    useCases: [
      'Join a list: a prefilled “JOIN” message to a keyword number.',
      'Ask for a callback or a quote from a shop, trades van or service desk.',
      'Check in or confirm an appointment at a clinic or salon.',
      'Vote or enter a poll at an event.',
      'Reach a driver, host or on-call contact from a notice.',
    ],
    printing: [
      'Write the action in words next to the code, such as “Text us to book”, so people know what it does before they scan.',
      'Keep the prefilled message to a few words so the code stays easy to read.',
      'Print at 2 cm (about 0.8 in) or larger, and test on both an iPhone and an Android phone.',
      'Use a number you will keep, because a printed code cannot be changed after the fact.',
    ],
    checks: [
      'Check whether the number can receive texts. Many landlines and some toll-free or service numbers cannot.',
      'Start the message with the keyword or reference your system expects, because the person is likely to send it exactly as written.',
      'Mention any cost or opt-in terms next to the code if you collect sign-ups by text.',
      'If you use a business messaging service, check whether it needs keywords registered before it will act on an incoming message.',
    ],
    privacy:
      'The number and message are put into the code in your browser. QRCraftly does not receive, send or store them, and never sends the text for anyone. The number is visible to anyone who scans, so use one meant for public contact.',
  },
  'phone-qr-code': {
    intro:
      'Make a QR code that opens the phone’s dialer with your number filled in. One scan replaces reading and typing the digits. It is free forever, with no sign-up and no ads, and the number you enter stays in your browser.',
    scanned: [
      'The phone brings up the number ready to call. On iPhone, the Camera app shows a call prompt, and on Android, the camera app or Google Lens offers to dial. The person still has to confirm before the call starts.',
      'Include the country code, such as +1 or +44, so the code works for callers in other countries.',
      'Nothing is dialled on its own. People see the number first and choose whether to place the call, which also keeps accidental calls from a stray scan to a minimum.',
    ],
    useCases: [
      'A “call us” code on a van, shop window or vehicle.',
      'A lost-and-found contact on a pet tag, luggage tag or bike.',
      'A reservations line on a menu or table card.',
      'A support line on a product, appliance or manual.',
      'A reception or emergency-contact number on a notice board.',
    ],
    printing: [
      'Add the number in plain text beside the code as a backup for anyone who cannot scan.',
      'For a small tag, print at least 2 cm (about 0.8 in) and keep the border around the code.',
      'Laminate or seal a code that sits outdoors so the ink does not fade and lower the contrast.',
      'A number change means a new code, so use a line you expect to keep.',
    ],
    checks: [
      'Check the number on a real phone by scanning the code and reading the digits shown before you call.',
      'Use the international format with a plus sign and the country code for any code that may travel, such as a luggage tag.',
      'Avoid putting a personal mobile on public material unless you want the calls, since printed codes stay in the world for a long time.',
      'If the line has opening hours, say so beside the code. A scan at midnight that rings out is the usual reason people stop trusting a code.',
    ],
    privacy:
      'The number is encoded in your browser and never sent to QRCraftly. Anyone can read a printed code, so use a number you are comfortable sharing publicly.',
  },
  'event-qr-code': {
    intro:
      'Turn an event into a QR code that adds it to a phone’s calendar. Set the title, time, place and details once, and guests save it with a scan. It is free, with no sign-up and no ads, and everything you enter stays in your browser.',
    scanned: [
      'The code carries a standard iCalendar event. On iPhone, the Camera app can offer to add it to Calendar. On Android, the camera app or Google Lens offers an add-to-calendar action, and how well it works varies by phone and calendar app.',
      'The person can check the date and time and choose which calendar to save it in before it is added.',
      'Reminders and alerts come from the person’s own calendar settings, not from the code. If you want people to be reminded, say so in the description or add a note about when to arrive.',
    ],
    useCases: [
      'A save-the-date on an invitation, poster or flyer.',
      'A class, workshop or webinar sign-up page.',
      'A store opening, launch or sale announcement.',
      'A recurring club meeting on a noticeboard.',
      'A wedding or party invitation.',
    ],
    printing: [
      'Add the date and place in text beside the code. People decide whether to scan from what they can read.',
      'Keep the description short, because long notes make the code denser and harder to read.',
      'The time is saved without a time zone, so it shows as the same clock time wherever it is scanned. For an online event, say the time zone in the description.',
      'Make a new code if the date or venue changes, and replace the old print.',
    ],
    checks: [
      'Check the start and end times on the form against the invitation. Swapped am and pm is the most common mistake.',
      'Add the full address in the location field, not only the venue name, so the map link in the calendar works.',
      'Scan the finished code with a phone and look at the calendar entry before it goes to print.',
      'Do not rely on the code alone for a large event. Put the main details in text on the page too, because not every camera app offers an add-to-calendar action.',
    ],
    privacy:
      'The event details are put into the code in your browser. QRCraftly receives nothing and stores nothing, and there is no guest list or sign-up to manage. Anyone who scans can read the title, place and notes.',
  },
  'location-qr-code': {
    intro:
      'Create a QR code that points at a place on the map, using latitude and longitude. Scan it to open the location in a maps app. It is free forever, with no sign-up and no ads, and the coordinates you enter stay in your browser.',
    scanned: [
      'The code holds a standard geo: link with your coordinates. On Android, scanning it usually opens the default maps app at that point. On iPhone, support depends on the iOS version and the scanner, so test it on the phones you care about.',
      'If you need it to work everywhere, put a link to your preferred map service in a URL code instead.',
      'The code carries only the coordinates, with no street address or place name. Maps apps show a pin and let the person start directions from where they are.',
    ],
    useCases: [
      'A meeting point for a festival, market stall or hike.',
      'A parking spot or entrance for a hard-to-find venue.',
      'A drop-off location on a delivery note or invitation.',
      'A trailhead or viewpoint on a sign.',
      'A property or viewing address in a brochure.',
    ],
    printing: [
      'Write the address or place name next to the code, so people can find it even without scanning.',
      'Use coordinates with about five decimal places, which is accurate to roughly a metre.',
      'Check the point on a map before printing, because swapped latitude and longitude put it in the wrong place.',
      'Print at 2 cm (about 0.8 in) or larger on a flat surface.',
    ],
    checks: [
      'Enter latitude first and longitude second. Positive latitude is north and positive longitude is east, so a minus sign matters in the western and southern hemispheres.',
      'Copy the coordinates from a map by dropping a pin at the exact entrance or meeting point, not the middle of the building.',
      'Open the code on a phone and compare the point with where you stand, before you print it for other people.',
      'For places where phone signal is weak, such as trails and car parks, also print the coordinates in text for people to type in or write down.',
    ],
    privacy:
      'The coordinates are encoded in your browser. QRCraftly does not receive, geocode or store them, and it never asks for your device location. Anyone who scans the code sees the point you chose.',
  },
  'meeting-qr-code': {
    intro:
      'Make a QR code that opens your meeting link on a phone, such as Zoom, Microsoft Teams or Google Meet. Put it on a slide or door so people can join with a scan. It is free, with no sign-up and no ads, and your link stays in your browser.',
    scanned: [
      'The code holds the meeting link as a normal web address. Scanning opens it in the meeting app if it is installed, or in the browser if not. The person still has to join, and the host’s waiting room and settings still apply.',
      'It is a plain link, so it works on iPhone and Android with the built-in camera.',
      'The meeting service decides who gets in. Registration, passwords and waiting rooms all work exactly as they do when someone clicks the link, because the code is only a shortcut to the same web address.',
    ],
    useCases: [
      'A slide in a hybrid presentation, so people in the room can also dial in.',
      'A sign on a meeting-room door or booking screen.',
      'A webinar invitation printed on a poster or flyer.',
      'A class or lecture room, so students join from their own device.',
      'A recurring team call on a shared notice board.',
    ],
    printing: [
      'Use a recurring or personal meeting room link for a code that will stay up, because a one-off link expires.',
      'On a slide, make the code large enough to scan from the back of the room. A fifth of the slide height is a good starting point.',
      'If your link includes a passcode, anyone with the code can join, so check the host’s waiting room settings.',
      'Replace the code when you change the meeting link or room.',
    ],
    checks: [
      'Paste the full meeting link from the invitation, including the https at the start, and not just the meeting number.',
      'Join once from your own phone through the code, to check that the room, passcode and waiting room all behave as you expect.',
      'Remember that a code on a slide can be photographed. If the meeting is private, keep the waiting room on and admit people by name.',
      'Show the code for the whole of the first few minutes, and keep the link in text on the page as well, for people who are not at a phone.',
    ],
    privacy:
      'The meeting link is turned into a code in your browser and never sent to QRCraftly. Whoever can see the code can use the link, including any passcode inside it.',
  },
  'payment-qr-code': {
    intro:
      'Generate a QR code for a Bitcoin, Ethereum, Solana or Litecoin payment request, with an optional amount and label, so people can pay you by scanning instead of copying a long address. It is free forever, with no sign-up and no ads, and your wallet address stays in your browser.',
    scanned: [
      'The code holds a payment link such as bitcoin: or ethereum: with your address. A wallet app that supports the scheme opens a payment screen with the address filled in. A phone camera without a wallet may just show the text.',
      'Wallet support for amounts and labels varies, and Ethereum uses the EIP-681 format. Always check the address and amount on the wallet screen before sending.',
      'A payment code asks for a transfer. It does not move money on its own, and the person must approve it in their wallet, where the network fee is also shown.',
    ],
    useCases: [
      'A donation code on a website, stream or event table.',
      'A tip jar at a market stall or in a shop.',
      'An invoice or receipt, with the amount preset.',
      'A fundraiser poster or flyer.',
      'A reminder at the end of a talk or article.',
    ],
    printing: [
      'Send a small test payment to the address before you print a large batch.',
      'Keep printed codes where you can see them, because someone can paste a different code over yours.',
      'Print at 2 cm (about 0.8 in) or larger and show the first and last characters of the address in text, so people can compare them.',
      'A code stays valid as long as you control the wallet, but a changed address needs a new print.',
    ],
    checks: [
      'Pick the same network as the address. A Bitcoin address on an Ethereum code, or the reverse, can send funds to a place nobody can reach.',
      'Read the address back from your wallet app after you paste it, comparing the first and last characters.',
      'Leave the amount blank for donations and tips, and set it only when the code is for one specific invoice.',
      'Some wallets ignore the amount or label and open with only the address. Mention the amount in text next to the code so the payer can confirm it.',
    ],
    privacy:
      'The address, amount and label are put into the code in your browser. QRCraftly does not receive them, check balances or touch any funds, and does not process payments. Wallet addresses are public by design, but only share the ones you want to be paid at.',
  },
  'social-qr-code': {
    intro:
      'Make a QR code that opens your profile on Instagram, X or TikTok. Type your handle and people can follow with a scan. It is free forever, with no sign-up and no ads, and the handle you enter never leaves your browser.',
    scanned: [
      'The code holds a normal web address for your profile. If the person has the app installed, iPhone and Android usually open the profile in the app, and otherwise it opens in the browser.',
      'They may need to be signed in to follow you, and the platform decides what they see.',
      'The code opens an ordinary profile link, so everything the platform shows, including whether your account is public or private, is up to your account settings and the person’s own login.',
    ],
    useCases: [
      'A market stall, shop counter or food truck.',
      'A business card, flyer or sticker.',
      'A poster or merch table at an event.',
      'A product box or packaging insert.',
      'A slide at the end of a talk or class.',
    ],
    printing: [
      'Check the code against your live profile before printing, because a mistyped handle opens someone else’s page.',
      'Put the handle in text beside the code so it still works if the code is damaged.',
      'Print at 2 cm (about 0.8 in) or larger, with good contrast against the background.',
      'If you rename the account, the code points at the old name, so make a new one.',
    ],
    checks: [
      'Type the handle without the at sign. The generator adds the rest of the profile address for you.',
      'Pick the right platform before you download, since the same handle can belong to different people on different networks.',
      'Open the finished code once on a phone, and make sure the profile that appears is the one you meant to share.',
      'Because it is a normal link, QRCraftly adds no tracking of its own. Any view counts come from the platform you are linking to, not from us, and you can see them in the platform’s own tools.',
      'Look at how the profile appears on a phone that is not signed in. A private account or a profile that needs a login shows a prompt, not your content, so people may not follow through.',
    ],
    privacy:
      'The handle is turned into a profile link in your browser, and QRCraftly does not see or store it. Following, views and any tracking are handled by the social platform once someone opens the link.',
  },
  'text-qr-code': {
    intro:
      'Turn any plain text into a QR code, from a short note or serial number to a longer message. Scanning shows the text as it is. It is free forever, with no sign-up and no ads, and the text you type stays in your browser.',
    scanned: [
      'A phone camera reads the code and shows the text, usually with options to copy it or search for it. Nothing opens, dials or installs. There is nothing to tap through.',
      'If the text is a web address, a phone or an email, use the matching generator so the phone treats it as a link and offers to open it.',
      'Most phone cameras show plain text in a small banner or a pop-up. Long text may be cut off in that banner, so people may need to tap to see all of it or to copy it.',
    ],
    useCases: [
      'A serial number, asset tag or inventory label.',
      'A short message or riddle for a scavenger hunt or classroom.',
      'A product code, batch number or reference ID.',
      'A short note or instruction for people standing in front of a display or exhibit.',
      'A snippet of text to move to another device.',
    ],
    printing: [
      'More text means a denser code. Keep it as short as you can for anything printed small.',
      'Use a higher error-correction setting for labels that may get scuffed, and a lower one for crisp screens.',
      'Print at 2 cm (about 0.8 in) or larger for short text, and bigger as the text grows.',
      'Test with two scanners, since a very long text can be at the edge of what a phone camera reads quickly.',
    ],
    checks: [
      'Read the text once on a phone before printing, since line breaks and special characters are saved exactly as typed.',
      'Keep numbers and codes unambiguous. Write the letter O and the digit 0 in a way people will not confuse when they read it back.',
      'If someone should be able to tap the result, use the URL, email or phone generator and not plain text.',
      'Plain text carries no instructions for the phone. If you want a specific app to open, pick the generator for that kind of content instead.',
    ],
    privacy:
      'The text is encoded in your browser and never uploaded, stored or logged by QRCraftly. Anyone who scans the printed code can read it all, so do not encode secrets you want to keep private.',
  },
};
