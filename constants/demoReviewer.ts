// App Store review demo account (Guideline 2.1(a)) — a fictional address that
// never receives real mail. Entering it on the login screen skips the emailed
// OTP and goes straight to the code screen; the fixed code is validated
// server-side by the `demo-review-login` Edge Function, not by Supabase's
// per-request OTP. Keep in sync with EDGE_FUNCTION `DEMO_REVIEWER_EMAIL` secret.
export const DEMO_REVIEWER_EMAIL = 'appreview.test@yermat.app';
