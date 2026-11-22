import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";

import { NotificationContext } from "../context/notificationContext";
import "../styles/notifications.css";

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastItem({ notification, onDismiss }) {
  const Icon = TOAST_ICONS[notification.variant] ?? Info;

  useEffect(() => {
    const duration = notification.duration ?? 4000;

    if (duration <= 0) return undefined;

    const timer = window.setTimeout(() => {
      onDismiss(notification.id);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [notification.id, notification.duration, onDismiss]);

  return (
    <div
      className={`gd-toast gd-toast-${notification.variant}`}
      role="status"
    >
      <Icon className="gd-toast-icon" size={20} aria-hidden="true" />

      <div className="gd-toast-content">
        {notification.title && <strong>{notification.title}</strong>}
        <p>{notification.message}</p>
      </div>

      <button
        type="button"
        className="gd-toast-close"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ConfirmationModal({ options, onResolve }) {
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  const tone = options.tone ?? "primary";

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    // Focus the safe choice first for destructive actions.
    const focusTarget = tone === "danger" ? cancelRef.current : confirmRef.current;
    focusTarget?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onResolve(false);
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onResolve, tone]);

  function handleConfirm() {
    if (submitting) return;

    setSubmitting(true);
    onResolve(true);
  }

  return (
    <div
      className="gd-confirm-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onResolve(false);
        }
      }}
    >
      <div
        ref={dialogRef}
        className="gd-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.message ? descriptionId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`gd-confirm-mark gd-confirm-mark-${tone}`}>
          <AlertTriangle size={22} aria-hidden="true" />
        </div>

        <h2 id={titleId}>{options.title ?? "Confirm action"}</h2>

        {options.message && (
          <p id={descriptionId} className="gd-confirm-message">
            {options.message}
          </p>
        )}

        <div className="gd-confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="gd-confirm-btn gd-confirm-btn-cancel"
            onClick={() => onResolve(false)}
            disabled={submitting}
          >
            {options.cancelLabel ?? "Cancel"}
          </button>

          <button
            ref={confirmRef}
            type="button"
            className={`gd-confirm-btn gd-confirm-btn-${tone}`}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting
              ? options.processingLabel ?? "Working..."
              : options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const nextToastId = useRef(0);
  const confirmationResolver = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((previous) =>
      previous.filter((notification) => notification.id !== id),
    );
  }, []);

  const pushToast = useCallback((variant, message, options = {}) => {
    if (!message) return null;

    const id = (nextToastId.current += 1);

    setToasts((previous) => [
      ...previous.slice(-4),
      {
        id,
        variant,
        message,
        title: options.title,
        duration: options.duration,
      },
    ]);

    return id;
  }, []);

  const toast = useMemo(() => {
    const createToast = (variant) => (message, options) =>
      pushToast(variant, message, options);

    return {
      success: createToast("success"),
      error: createToast("error"),
      warning: createToast("warning"),
      info: createToast("info"),
    };
  }, [pushToast]);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      if (confirmationResolver.current) {
        confirmationResolver.current(false);
      }

      confirmationResolver.current = resolve;
      setConfirmation(options);
    });
  }, []);

  const resolveConfirmation = useCallback((result) => {
    const resolve = confirmationResolver.current;

    confirmationResolver.current = null;
    setConfirmation(null);
    resolve?.(result);
  }, []);

  const contextValue = useMemo(
    () => ({ toast, confirm }),
    [toast, confirm],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      <div
        className="gd-toast-viewport"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((notification) => (
          <ToastItem
            key={notification.id}
            notification={notification}
            onDismiss={dismissToast}
          />
        ))}
      </div>

      {confirmation && (
        <ConfirmationModal
          options={confirmation}
          onResolve={resolveConfirmation}
        />
      )}
    </NotificationContext.Provider>
  );
}
