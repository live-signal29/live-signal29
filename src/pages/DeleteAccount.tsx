import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SUPPORT_EMAIL = "mybusiness903@gmail.com";
const APP_NAME = "Live-signals Buy/Sell";

const DeleteAccount = () => {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Delete my account"
  )}&body=${encodeURIComponent(
    "Please delete my account and all associated data.\n\nRegistered email: "
  )}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-2 gradient-text">
              Delete Your Account
            </h1>
            <p className="text-muted-foreground mb-8">
              {APP_NAME} (Live Signals) — account and data deletion request
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                How to request deletion
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                <li>
                  Send an email to{" "}
                  <a className="text-primary underline" href={mailto}>
                    {SUPPORT_EMAIL}
                  </a>{" "}
                  with the subject <strong>"Delete my account"</strong>.
                </li>
                <li>
                  Send it from the <strong>same email address</strong> you used
                  to register in {APP_NAME}, so we can verify the account is
                  yours.
                </li>
                <li>
                  We will delete your account and confirm by reply within{" "}
                  <strong>7 days</strong>.
                </li>
              </ol>

              <a
                href={mailto}
                className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
              >
                Email deletion request
              </a>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                What gets deleted
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Your account (email, name and login credentials)</li>
                <li>
                  Your profile and subscription information, favourites, price
                  alerts, trade journal and notification settings
                </li>
                <li>
                  Your signal unlock history, referral data and MT5 copier
                  requests
                </li>
                <li>Push notification (device) identifiers linked to your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                What may be kept
              </h2>
              <p className="text-muted-foreground">
                Records we are required to keep for legal, tax or fraud
                prevention reasons (for example payment or purchase records)
                may be retained for the period required by law, and are not
                used for any other purpose. Purchases made through Google Play
                are also held by Google under its own policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                Delete only some of your data
              </h2>
              <p className="text-muted-foreground">
                If you only want specific data removed without deleting your
                account, email us at {SUPPORT_EMAIL} and tell us what to remove.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DeleteAccount;
