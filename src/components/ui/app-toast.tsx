"use client";

import {
  Toast,
  ToastBody,
  ToastTitle,
  ToastIntent,
  useToastController,
} from "@fluentui/react-components";

export function useAppToast() {
  const { dispatchToast } = useToastController("app-toaster");

  return (title: string, body?: string, intent: ToastIntent = "success") => {
    dispatchToast(
      <Toast>
        <ToastTitle>{title}</ToastTitle>
        {body ? <ToastBody>{body}</ToastBody> : null}
      </Toast>,
      { intent },
    );
  };
}
