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

/**
 * One block of a guide's body. Text may hold `[label](href)` links and nothing else: guides are
 * plain data, so the page renders them without a Markdown parser and without raw HTML.
 */
export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'table'; caption: string; head: string[]; rows: string[][] }
  | { type: 'note'; title: string; text: string };

/** A guide's H2 section; `id` becomes the anchor and the table-of-contents entry. */
export interface GuideSection {
  id: string;
  heading: string;
  blocks: GuideBlock[];
}

/** A source a guide's claims rest on. */
export interface GuideSource {
  /** Publisher and title, so the source can be found even if its address moves. */
  label: string;
  url: string;
  /** What the guide takes from it. */
  supports: string;
}

/** A long-form guide in the `/guides` hub (#1038). */
export interface Guide {
  /** Route segment: the guide lives at `/guides/<slug>`. */
  slug: string;
  /** The page heading (H1). */
  title: string;
  /** Short name for breadcrumbs and the hub. */
  shortTitle: string;
  /** Meta title, ending with the brand. */
  seoTitle: string;
  /** Meta description, 155 characters at most. */
  description: string;
  /** Opening sentences under the heading. */
  lead: string;
  /** First publication, `YYYY-MM-DD`. */
  datePublished: string;
  /** Last substantive edit, `YYYY-MM-DD`. Also the sitemap `lastmod`. */
  dateModified: string;
  sections: GuideSection[];
  sources: GuideSource[];
  /** Slugs of guides to link at the end. */
  related: string[];
}

/** The byline every guide shows: the guides are written by the project, not a named person. */
export const GUIDE_AUTHOR = 'QRCraftly';

export const guides: Guide[] = [
  {
    slug: 'why-qr-codes-stop-working',
    title: 'Why your QR code stopped working (and how to make one that never will)',
    shortTitle: 'Why QR codes stop working',
    seoTitle: 'Why Your QR Code Stopped Working (and How to Fix It for Good) | QRCraftly',
    description:
      'QR codes do not expire by themselves. Find out whether yours was switched off, points at a dead page or is just hard to scan, and how to make one that lasts.',
    lead: 'A QR code is only a picture of some data, so it cannot expire or switch itself off. When one stops working, it is nearly always one of three things. This guide shows you how to tell which in two minutes, and how to make a code that never stops.',
    datePublished: '2026-10-03',
    dateModified: '2026-10-03',
    sections: [
      {
        id: 'short-answer',
        heading: 'The short answer',
        blocks: [
          {
            type: 'p',
            text: 'A QR code holds a few hundred characters of text, usually a web address, drawn as a pattern of squares. Nothing in the pattern can run out. If a code that used to work no longer does, one of these happened:',
          },
          {
            type: 'ol',
            items: [
              'It was a “dynamic” code, and the service that made it switched it off. The code held an address on that service, and the service decides where it leads, or whether it leads anywhere.',
              'The page it points to has moved, been renamed or been deleted, or the domain it lives on has lapsed.',
              'The printed code is hard for a camera to read: too small, too faint, damaged, or crowded by a logo.',
            ],
          },
          {
            type: 'p',
            text: 'The first is the one people find most upsetting, because the code looks fine and the only fix is to pay or to print again. It is also the only one you can rule out before you ever print: make a static code, and there is nothing for anyone to switch off.',
          },
        ],
      },
      {
        id: 'which-one',
        heading: 'Find out which one in two minutes',
        blocks: [
          {
            type: 'ol',
            items: [
              'Scan the code with your phone’s camera, or drop a photo of it on the [QR code scanner](/qr-code-scanner). It shows the real address behind the code before opening anything.',
              'If nothing is read at all, the problem is the print or the camera. Go to [the printing section](#hard-to-read).',
              'If an address appears and it belongs to someone other than you, such as a short link on a QR service’s own domain, you have a dynamic code. Go to [the dynamic code section](#switched-off).',
              'If the address is yours, or is the page you meant, open it. If the browser shows an error or the wrong page, the destination is the problem. Go to [the dead page section](#dead-page).',
            ],
          },
          {
            type: 'p',
            text: 'Have a photo of the code but no phone handy? The [QR code checker](/qr-code-checker) reads a picture of any code, shows what it holds, and tells you whether it would survive a poor print.',
          },
        ],
      },
      {
        id: 'switched-off',
        heading: 'Cause 1: a dynamic code that was switched off',
        blocks: [
          {
            type: 'p',
            text: 'A dynamic code does not contain your address. It contains a short address on the provider’s own domain, and the provider’s server forwards each scan to your real page. That is how a provider can show you scan counts and let you change the destination after printing. It is also why the code depends on them: if the account lapses, the free trial ends or the provider closes, the forwarding stops and the code goes dead or lands on the provider’s own page.',
          },
          {
            type: 'note',
            title: 'What you can and cannot do',
            text: 'Reactivating the account usually restores the same code, because the code itself never changed. If you have no account to reactivate, the printed code cannot be repaired. You have to make a new code and replace the old one. Before you do, check whether you can find the old destination: it is the one thing the old code no longer tells you.',
          },
          {
            type: 'p',
            text: 'The lasting fix is to stop depending on the middleman. A static code holds your address itself, so it keeps working for as long as that address does. If you still want to be able to change the destination later, you can do that without a vendor: point the static code at a short address on a domain you own, and change where that address leads. [Static vs dynamic QR codes](/guides/static-vs-dynamic-qr-codes) explains the trade-offs in full.',
          },
        ],
      },
      {
        id: 'dead-page',
        heading: 'Cause 2: the page it points to is gone',
        blocks: [
          {
            type: 'p',
            text: 'Links break, and a printed code cannot be edited. The usual ways a destination disappears are:',
          },
          {
            type: 'ul',
            items: [
              'A website redesign that changes page addresses without redirecting the old ones.',
              'A PDF, menu or form that was renamed, replaced under a new name, or taken down.',
              'A domain that expired and was not renewed.',
              'A link shortener or file host that closed or changed its terms.',
              'A social profile whose username changed.',
            ],
          },
          {
            type: 'p',
            text: 'If you control the destination, the repair is cheap: put a redirect from the old address to the new one, and every printed code works again. If you do not control it, the code is only as durable as someone else’s page. Point codes at an address you own whenever you can, and keep that address alive. Renew the domain, and add a redirect whenever you move a page.',
          },
        ],
      },
      {
        id: 'hard-to-read',
        heading: 'Cause 3: the print is hard to read',
        blocks: [
          {
            type: 'p',
            text: 'Phones are good at reading QR codes, but they have limits. These are the usual culprits, and what to do about each.',
          },
          {
            type: 'table',
            caption: 'Common reading problems and their fixes',
            head: ['What you see', 'Likely cause', 'Fix'],
            rows: [
              ['Phone cannot find a code at all', 'Printed too small for the distance it is scanned from', 'A common rule of thumb is a code about one tenth as wide as the scanning distance. For close-up use, print at least 2 cm (0.8 in) wide.'],
              ['Reads on a screen, fails on paper', 'Low contrast, faint ink, or a glossy surface that reflects light', 'Use dark modules on a light background, a matte finish, and check the print under the light where it will hang.'],
              ['Works only if you hold it just right', 'No blank border (the quiet zone), or the code is cropped or on a curved surface', 'Leave a blank margin of at least four modules on every side, which is the width the standard specifies, and keep the code flat.'],
              ['Fails after it was folded, scratched or sun-faded', 'Damage beyond what error correction can repair', 'Print on a durable material. Higher error correction tolerates more damage, up to about 30% at level H.'],
              ['Worked until a logo was added', 'The logo covers too much of the code', 'Make the logo smaller, or raise the error correction to H, and test again.'],
              ['The code looks dense and busy', 'Too much data in it, so each square is tiny', 'Encode a shorter address. A short address gives fewer, larger squares that are easier to read.'],
              ['Light squares on a dark background fail on some phones', 'Inverted codes are not supported by every scanner', 'Use dark on light, unless you have tested the inverted version on the phones you care about.'],
            ],
          },
          {
            type: 'p',
            text: 'Error correction is what lets a damaged code still scan. Level L repairs about 7% of the code, M about 15%, Q about 25% and H about 30%, according to the standard’s authors. Higher levels make the code denser, so they trade readability at small sizes for tolerance of damage.',
          },
          {
            type: 'p',
            text: 'To see how your code copes, run it through the [QR code checker](/qr-code-checker), which simulates a blurry print, or damage it on purpose in the [QR Arcade](/arcade).',
          },
        ],
      },
      {
        id: 'phone-side',
        heading: 'Cause 4: it is the phone, not the code',
        blocks: [
          {
            type: 'ul',
            items: [
              'The camera app has no permission for the camera, or a scanner setting is turned off.',
              'A smudged or cracked lens, or a screen protector over the camera.',
              'Scanning a code shown on another screen: glare, a low brightness setting or a refresh-rate pattern can all spoil it. Raise the brightness or save the image and open it from the gallery.',
              'An old phone or browser that cannot read codes natively. Photo-based scanners such as the one on this site work around that.',
            ],
          },
          {
            type: 'p',
            text: 'If one phone fails and another reads the code instantly, the code is probably borderline. Fix the print rather than trusting the better phone.',
          },
        ],
      },
      {
        id: 'never-stops',
        heading: 'How to make a code that never stops working',
        blocks: [
          {
            type: 'ol',
            items: [
              'Make a static code, so the code holds your address itself and no service sits between the scan and your page.',
              'Point it at an address you control, and keep that address alive. Renew the domain, redirect old paths, and do not rename the page.',
              'Keep the address short. Shorter means larger squares and an easier scan.',
              'Use error correction M or Q for most print, and H when there is a logo or the code may be scuffed.',
              'Use dark modules on a light background, keep the blank border, and print at a size that suits the distance.',
              'Test the printed copy with two different phones, in the place where it will hang, before you print a batch.',
              'Keep the original file, and note what the code points to and when you made it. Check it again once a year.',
            ],
          },
          {
            type: 'p',
            text: 'QRCraftly makes static codes only. There is no account, nothing is stored on a server, and the code contains exactly what you typed, so there is nothing for us to switch off. It also means we cannot offer scan counts or change a destination after printing. [Static vs dynamic QR codes](/guides/static-vs-dynamic-qr-codes) is honest about what that costs. You can [make a code now](/) and check it before you print.',
          },
        ],
      },
    ],
    sources: [
      {
        label: 'Denso Wave (the inventor of QR Code), “Error correction feature”, qrcode.com',
        url: 'https://www.qrcode.com/en/about/error_correction.html',
        supports: 'The four error correction levels and the share of the code each can restore (about 7%, 15%, 25% and 30%).',
      },
      {
        label: 'Denso Wave, “Standardization”, qrcode.com',
        url: 'https://www.qrcode.com/en/about/standards.html',
        supports: 'QR Code is specified by ISO/IEC 18004, the standard that defines the symbol, its error correction and its quiet zone.',
      },
      {
        label: 'ISO/IEC 18004:2015, “Information technology: Automatic identification and data capture techniques: QR Code bar code symbology specification”',
        url: 'https://www.iso.org/standard/62021.html',
        supports: 'The quiet zone of four modules around the symbol.',
      },
    ],
    related: ['static-vs-dynamic-qr-codes'],
  },

  {
    slug: 'static-vs-dynamic-qr-codes',
    title: 'Static vs dynamic QR codes: what you give up and what you pay',
    shortTitle: 'Static vs dynamic QR codes',
    seoTitle: 'Static vs Dynamic QR Codes: What You Give Up and What You Pay | QRCraftly',
    description:
      'A plain comparison of static and dynamic QR codes: editing, scan counts, cost, privacy and what happens if the provider disappears, with a way to keep both.',
    lead: 'Dynamic QR codes can be edited and counted, and static ones cannot. The price of that is a subscription, a dependency on one company and a record of every scan. This guide lays out both sides, including the parts that favour dynamic codes, so you can choose.',
    datePublished: '2026-10-03',
    dateModified: '2026-10-03',
    sections: [
      {
        id: 'short-answer',
        heading: 'The short answer',
        blocks: [
          {
            type: 'p',
            text: 'A static code holds your content itself. A dynamic code holds a short address on a provider’s server, which forwards every scan to your page. That one difference produces every other difference between them.',
          },
          {
            type: 'ul',
            items: [
              'Choose static when the destination will not change, when the code must outlive any company, or when the content is not a web address at all, such as Wi-Fi details or a contact card.',
              'Choose dynamic when you need to change the destination after printing, or need scan counts from the code itself, and you accept that you rent it.',
              'In between, you can get most of the editing without the rental: put a static code on an address you own, and change where that address leads.',
            ],
          },
        ],
      },
      {
        id: 'how-they-work',
        heading: 'How each one works',
        blocks: [
          {
            type: 'p',
            text: 'Scanning a static code: the phone reads the pattern, decodes your address and opens it. Nothing else is involved.',
          },
          {
            type: 'p',
            text: 'Scanning a dynamic code: the phone reads the pattern, decodes the provider’s short address and opens it. The provider’s server looks up where that code currently points, notes the scan, and sends the phone on to your page. The pattern never changes, but what sits behind it can.',
          },
          {
            type: 'p',
            text: 'The provider’s server is the whole point of a dynamic code, and it is also the single point of failure. If it is down, switched off or closed, the code leads nowhere.',
          },
        ],
      },
      {
        id: 'comparison',
        heading: 'Side by side',
        blocks: [
          {
            type: 'table',
            caption: 'Static and dynamic QR codes compared',
            head: ['Feature', 'Static', 'Dynamic'],
            rows: [
              ['What the code holds', 'Your content itself', 'A short address on the provider’s server'],
              ['Change the destination after printing', 'No. Print a new code', 'Yes, from the provider’s dashboard'],
              ['Scan counts from the code', 'None', 'Yes, as the provider records them'],
              ['Cost', 'Free to make with no strings', 'Usually a subscription or a trial that ends'],
              ['If the provider closes or you stop paying', 'Nothing happens', 'The code stops working'],
              ['Works for Wi-Fi, contact cards, plain text', 'Yes', 'No, because it can only redirect to a web address'],
              ['Pattern density', 'Denser if the address is long', 'Sparser, because the short address is short'],
              ['Who sees each scan', 'Only the page you point to', 'The provider as well'],
              ['Typical failure', 'The destination page moves', 'The subscription lapses'],
            ],
          },
        ],
      },
      {
        id: 'what-dynamic-gives',
        heading: 'What dynamic codes genuinely give you',
        blocks: [
          {
            type: 'p',
            text: 'They are not a trick, and for some jobs they are the right tool.',
          },
          {
            type: 'ul',
            items: [
              'Editing after printing. A campaign poster that runs for a year can point at this month’s offer, and a mistake in the destination is a setting, not a reprint.',
              'Scan counts without touching the destination. If you cannot add analytics to the page behind the code, the provider’s count is the only count you will get.',
              'A simpler pattern. The short address is short, so the code has fewer, larger squares. That helps for small or low-quality print.',
              'Several destinations from one code, or rules by device, time or place, where the provider offers them.',
            ],
          },
        ],
      },
      {
        id: 'what-dynamic-costs',
        heading: 'What dynamic codes cost',
        blocks: [
          {
            type: 'ul',
            items: [
              'A running fee. The code is yours to print but not yours to keep working. If you stop paying, or a trial ends, the provider can deactivate it, and every printed copy goes dead with it.',
              'Lock-in. The code holds the provider’s address, so you cannot move it to another provider. The only way out is to print new codes.',
              'A third party in every scan. For the counts to exist, each scan has to pass through the provider’s server, which sees at least the time, the device and the network address. Read their privacy terms before you use one for anything sensitive.',
              'A trust cost for your visitors. People are told to check where a code leads before they open it, and the U.S. Federal Trade Commission has warned about links hidden in QR codes. A short address on a service’s domain hides the real destination until after the scan, while an address on your own domain is easier to trust.',
              'Their reliability becomes yours. An outage, a policy change or a closure at the provider is an outage for your printed material.',
            ],
          },
          {
            type: 'note',
            title: 'Before you rent one',
            text: 'Ask what happens to your codes when a subscription ends, whether you can use your own domain for the short address, and whether you can export the destinations. If the short address is on your domain, you can leave. If it is not, you cannot.',
          },
        ],
      },
      {
        id: 'middle-path',
        heading: 'The middle path: your own redirect',
        blocks: [
          {
            type: 'p',
            text: 'You do not need a QR service to be able to change a destination. Make a static code that points at a short address on a domain you own, such as example.com/menu, and set that address to redirect to the real page. To change the destination, change the redirect. Most web hosts and static site platforms support redirect rules, and the code keeps working for as long as you keep the domain.',
          },
          {
            type: 'p',
            text: 'The same idea gives you counts without a vendor in the middle:',
          },
          {
            type: 'ul',
            items: [
              'Add a campaign tag to the destination address, then read the visits in the analytics you already run on that page.',
              'Use a different short address for each placement, such as example.com/poster and example.com/flyer, to tell placements apart.',
              'Count requests to the redirect itself in your host’s logs, if it keeps them.',
            ],
          },
          {
            type: 'p',
            text: 'It takes a little more setup than a dashboard, and the data stays with you.',
          },
        ],
      },
      {
        id: 'decide',
        heading: 'How to decide',
        blocks: [
          {
            type: 'table',
            caption: 'Which kind of code for which job',
            head: ['If your code is for…', 'Use'],
            rows: [
              ['A Wi-Fi network, contact card, plain text or other non-web content', 'Static (dynamic is not possible)'],
              ['A menu, flyer or business card that will be reprinted when it changes', 'Static'],
              ['Packaging, signage or a manual that has to last for years', 'Static, pointing at an address you own'],
              ['A campaign where the destination changes and you cannot add analytics to the page', 'Dynamic, on your own domain if the provider allows it'],
              ['A campaign where you can change the destination yourself', 'Static on your own redirect'],
            ],
          },
        ],
      },
      {
        id: 'qrcraftly',
        heading: 'Where QRCraftly stands',
        blocks: [
          {
            type: 'p',
            text: 'QRCraftly makes static codes only. There are no accounts, no servers that store your codes and no redirects, so a code you make here keeps working as long as the address inside it does, whether or not this site is still around. That is a deliberate decision, recorded in [an architecture decision](https://github.com/fderuiter/QRCraftly-web/blob/main/docs/adr/0022-no-dynamic-qr-codes-client-side-only.md), and it has a cost: we cannot give you scan counts or editable destinations. If you need those, use the middle path above or a dynamic provider whose terms you have read.',
          },
          {
            type: 'p',
            text: 'Wondering why a code you already have stopped working? [Why your QR code stopped working](/guides/why-qr-codes-stop-working) helps you tell a switched-off dynamic code from a dead page and a hard-to-read print. To make a static code, [start here](/).',
          },
        ],
      },
    ],
    sources: [
      {
        label: 'Denso Wave (the inventor of QR Code), “Types of QR Code” and “QR Code capacity”, qrcode.com',
        url: 'https://www.qrcode.com/en/about/version.html',
        supports: 'A longer encoded address needs a larger version, with more and smaller modules.',
      },
      {
        label: 'Denso Wave, “Standardization”, qrcode.com',
        url: 'https://www.qrcode.com/en/about/standards.html',
        supports: 'QR Code is specified by ISO/IEC 18004; a code holds data, and what a reader does with it is up to the reader.',
      },
      {
        label: 'U.S. Federal Trade Commission, “Scammers hide harmful links in QR codes to steal your information”, consumer.ftc.gov (December 2023)',
        url: 'https://consumer.ftc.gov/consumer-alerts/2023/12/scammers-hide-harmful-links-qr-codes-steal-your-information',
        supports: 'A QR code can lead anywhere, which is why a third-party address in the middle deserves scrutiny.',
      },
    ],
    related: ['why-qr-codes-stop-working'],
  },
];

/**
 * Looks up a guide by its route segment.
 * @param slug - The guide's slug.
 * @returns The guide, or undefined.
 */
export function getGuide(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

/**
 * Estimates the reading time of a guide at 220 words a minute.
 * @param guide - The guide.
 * @returns Whole minutes, at least 1.
 */
export function readingMinutes(guide: Guide): number {
  const words = [guide.lead, ...guide.sections.flatMap((section) => section.blocks.map(blockText))].join(' ').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

function blockText(block: GuideBlock): string {
  switch (block.type) {
    case 'p':
      return block.text;
    case 'note':
      return `${block.title} ${block.text}`;
    case 'table':
      return [block.caption, ...block.head, ...block.rows.flat()].join(' ');
    default:
      return block.items.join(' ');
  }
}
