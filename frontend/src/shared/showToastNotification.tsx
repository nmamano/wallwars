import { toast, Slide } from "react-toastify";

export default function showToastNotification(
  text: string,
  duration?: number
): void {
  if (!duration || duration === 0) duration = 2500;
  toast(text, {
    autoClose: duration,
    hideProgressBar: true,
    transition: Slide,
    pauseOnFocusLoss: false,
  });
}
