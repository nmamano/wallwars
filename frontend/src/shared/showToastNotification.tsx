import { toast, Slide } from "react-toastify";

export default function showToastNotification(
  text: string,
  duration?: number
): void {
  console.log("inside showToastNotification: " + text);
  if (!duration || duration === 0) duration = 2500;
  toast(text, {
    autoClose: duration,
    hideProgressBar: false,
    transition: Slide,
    pauseOnFocusLoss: false,
  });
}
