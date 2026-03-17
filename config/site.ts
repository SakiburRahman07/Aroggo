export const siteConfig = {
  name: "OpsPilot Health",
  tagline: "AI-powered clinic operations and team workspace platform",
  description:
    "OpsPilot Health helps clinics coordinate operations, patient workflows, documents, and internal teamwork with secure, AI-assisted productivity tools.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  nav: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Login", href: "/login" }
  ]
} as const;

