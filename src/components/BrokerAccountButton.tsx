import exnessLogo from "@/assets/exness-logo.png";

export const BrokerAccountButton = () => {
  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        onClick={() => window.open("https://one.exnessonelink.com/a/vtkbbmje", "_blank")}
        className="h-16 w-16 rounded-full shadow-lg hover:scale-110 transition-transform bg-white flex items-center justify-center overflow-hidden border-2 border-primary/20 hover:border-primary"
        aria-label="Open Exness Broker Account"
      >
        <img 
          src={exnessLogo} 
          alt="Exness" 
          className="w-12 h-12 object-contain"
        />
      </button>
    </div>
  );
};
