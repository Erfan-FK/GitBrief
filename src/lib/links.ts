/**
 * Outbound links — single source of truth so the donate target can be swapped
 * in one place once a payment provider is chosen (see DEPLOY.md "Donations").
 */
export const LINKS = {
  github: "https://github.com/Erfan-FK/GitBrief",
  githubOwner: "https://github.com/Erfan-FK",
  x: "https://x.com/erfanfkia",
  /** Gmail compose deep-link — opens a draft to the maintainer in the browser. */
  contact:
    "https://mail.google.com/mail/?view=cm&fs=1&to=erfanfarhangkia@gmail.com&su=gitbrief",
  /**
   * Donation destination. GitHub Sponsors routes card payments to your bank
   * via Stripe Connect with zero platform fee. Swap to a Ko-fi / Stripe
   * Payment Link URL here if you prefer instant payouts — nothing else changes.
   */
  donate: "https://github.com/sponsors/Erfan-FK",
} as const;
