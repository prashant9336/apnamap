import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ApnaMap",
  description: "How ApnaMap collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  const lastUpdated = "April 24, 2026";

  return (
    <main
      style={{ background: "#05070C", color: "#EDEEF5", minHeight: "100vh" }}
      className="px-5 py-10 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="mb-10">
        <span
          style={{ color: "#FF5E1A" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          ApnaMap
        </span>
        <h1 className="text-3xl font-bold mt-2 mb-1">Privacy Policy</h1>
        <p style={{ color: "#9A9DB0" }} className="text-sm">
          Last updated: {lastUpdated}
        </p>
      </div>

      <div className="space-y-8 text-[15px] leading-relaxed" style={{ color: "#CBCDD8" }}>

        {/* Intro */}
        <section>
          <p>
            ApnaMap (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a hyperlocal shop
            discovery platform that helps you find shops, offers, and services near you.
            This Privacy Policy explains what information we collect, how we use it, and
            your rights regarding your data.
          </p>
          <p className="mt-3">
            By using ApnaMap, you agree to the practices described in this policy.
          </p>
        </section>

        <Divider />

        {/* Location */}
        <Section title="1. Location Information">
          <p>
            ApnaMap requests access to your device&apos;s location (GPS) to show you shops,
            offers, and services in your immediate vicinity. Location data is used
            in real time to personalise your discovery feed and is not stored on
            our servers beyond what is necessary to serve your current session.
          </p>
          <p className="mt-3">
            You can deny or revoke location permission at any time through your device
            settings. Some features will not work without location access.
          </p>
        </Section>

        <Divider />

        {/* Personal Info */}
        <Section title="2. Personal Information">
          <p>
            We may collect the following information when you create an account or
            interact with the platform:
          </p>
          <ul className="mt-3 space-y-2 pl-5 list-disc marker:text-[#FF5E1A]">
            <li>
              <strong className="text-[#EDEEF5]">Name</strong> — to personalise your
              experience (optional).
            </li>
            <li>
              <strong className="text-[#EDEEF5]">Phone number</strong> — for account
              login or verification (optional; only collected if you choose to sign in).
            </li>
          </ul>
          <p className="mt-3">
            We do not require you to provide personal information to browse shops or
            view offers. An account is optional.
          </p>
        </Section>

        <Divider />

        {/* How We Use */}
        <Section title="3. How We Use Your Information">
          <p>Information we collect is used solely to:</p>
          <ul className="mt-3 space-y-2 pl-5 list-disc marker:text-[#FF5E1A]">
            <li>Show you nearby shops and relevant offers.</li>
            <li>Remember your locality preference across sessions.</li>
            <li>Improve app performance, relevance, and features.</li>
            <li>Respond to support enquiries you send us.</li>
          </ul>
          <p className="mt-3">
            We do not use your data for automated profiling, targeted advertising,
            or any purpose beyond improving your experience on ApnaMap.
          </p>
        </Section>

        <Divider />

        {/* No Sale */}
        <Section title="4. We Do Not Sell Your Data">
          <p>
            <strong className="text-[#EDEEF5]">
              We do not sell, rent, trade, or share your personal information
              with third parties for commercial purposes.
            </strong>{" "}
            Your data is yours. It exists only to make ApnaMap work better for you.
          </p>
        </Section>

        <Divider />

        {/* Third Parties */}
        <Section title="5. Third-Party Services">
          <p>
            ApnaMap may use the following trusted services to operate the platform.
            Each has its own privacy policy:
          </p>
          <ul className="mt-3 space-y-2 pl-5 list-disc marker:text-[#FF5E1A]">
            <li>
              <strong className="text-[#EDEEF5]">Supabase</strong> — database and
              authentication infrastructure.
            </li>
            <li>
              <strong className="text-[#EDEEF5]">Vercel</strong> — hosting and
              content delivery.
            </li>
          </ul>
          <p className="mt-3">
            We do not integrate advertising networks, analytics brokers, or
            social-media trackers.
          </p>
        </Section>

        <Divider />

        {/* Data Security */}
        <Section title="6. Data Security">
          <p>
            We implement industry-standard measures to protect your information,
            including encrypted connections (HTTPS) and access-controlled databases.
            No method of transmission over the internet is 100% secure; we encourage
            you to use a strong, unique password if you create an account.
          </p>
        </Section>

        <Divider />

        {/* Retention */}
        <Section title="7. Data Retention">
          <p>
            We retain your account information for as long as your account is active
            or as needed to provide the service. You may request deletion of your
            account and associated data at any time by contacting us at the address
            below.
          </p>
        </Section>

        <Divider />

        {/* Children */}
        <Section title="8. Children's Privacy">
          <p>
            ApnaMap is not directed at children under 13. We do not knowingly collect
            personal information from children. If you believe a child has provided us
            with personal information, please contact us and we will delete it promptly.
          </p>
        </Section>

        <Divider />

        {/* Your Rights */}
        <Section title="9. Your Rights">
          <p>You have the right to:</p>
          <ul className="mt-3 space-y-2 pl-5 list-disc marker:text-[#FF5E1A]">
            <li>Access the personal information we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and data.</li>
            <li>Withdraw location permission at any time via device settings.</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:support@apnamap.com"
              style={{ color: "#FF5E1A" }}
              className="underline underline-offset-2"
            >
              support@apnamap.com
            </a>
            .
          </p>
        </Section>

        <Divider />

        {/* Changes */}
        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will
            revise the &quot;Last updated&quot; date at the top of this page. Continued use of
            ApnaMap after changes are posted constitutes your acceptance of the
            updated policy.
          </p>
        </Section>

        <Divider />

        {/* Contact */}
        <Section title="11. Contact Us">
          <p>
            If you have questions or concerns about this Privacy Policy or how your
            data is handled, please reach out:
          </p>
          <div
            className="mt-4 rounded-xl p-4"
            style={{ background: "#0F1118", border: "1px solid #1E2030" }}
          >
            <p className="font-semibold" style={{ color: "#EDEEF5" }}>
              ApnaMap Support
            </p>
            <a
              href="mailto:support@apnamap.com"
              style={{ color: "#FF5E1A" }}
              className="text-sm underline underline-offset-2"
            >
              support@apnamap.com
            </a>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <p
        className="mt-14 text-center text-xs"
        style={{ color: "#4A4D60" }}
      >
        © {new Date().getFullYear()} ApnaMap. All rights reserved.
      </p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="text-lg font-semibold mb-3"
        style={{ color: "#EDEEF5" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Divider() {
  return <hr style={{ borderColor: "#1E2030" }} />;
}
