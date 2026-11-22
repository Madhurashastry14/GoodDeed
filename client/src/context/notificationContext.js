import { createContext, useContext } from "react";

export const NotificationContext = createContext(null);

export function useToast() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useToast must be used inside NotificationProvider");
  }

  return context.toast;
}

export function useConfirm() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useConfirm must be used inside NotificationProvider");
  }

  return context.confirm;
}
