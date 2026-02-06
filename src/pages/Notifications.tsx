import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotificationsInbox from "@/components/NotificationsInbox";

const Notifications = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Notifications</h1>
        <NotificationsInbox />
      </main>

      <Footer />
    </div>
  );
};

export default Notifications;
