## 2025-04-29 - Focus Visible Inconsistency
**Learning:** Keyboard navigation focus states were sporadically applied. While grouped controls and custom inputs had excellent `focus-visible` states, primary app action buttons (Download, Share, Dark Mode) and some inner component buttons (Password toggle, Logo remove) lacked them, creating an inconsistent keyboard experience.
**Action:** Always verify keyboard focus states across *all* interactive elements, not just form inputs, to ensure a cohesive accessibility experience.
