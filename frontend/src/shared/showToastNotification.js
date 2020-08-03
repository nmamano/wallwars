import { toast, Slide } from "react-toastify";

const showToastNotification = (text, duration) => {
  if (!duration || duration === 0) duration = 2500;
  toast(text, {
    autoClose: duration,
    hideProgressBar: true,
    transition: Slide,
    pauseOnFocusLoss: false,
  });
};

export default showToastNotification;
