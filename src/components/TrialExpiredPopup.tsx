import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TrialExpiredPopupProps {
  open: boolean;
  onClose: () => void;
}

const TrialExpiredPopup = ({ open, onClose }: TrialExpiredPopupProps) => {
  const navigate = useNavigate();

  const handleOk = () => {
    onClose();
    navigate("/premium#plans-section");
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl flex items-center gap-2">
            Trial Expired 🔒
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Your free trial has expired. Upgrade to premium to continue receiving live trading signals.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={handleOk}
            className="w-full bg-warning hover:bg-warning/90 text-black font-semibold"
          >
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TrialExpiredPopup;
