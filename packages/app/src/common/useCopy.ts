import { useCallback, useState } from "react";

export const useCopy = (): {
  copiedText: string | null;
  copyToClipboard: (address: string) => void;
} => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedText(address);
    setTimeout(() => setCopiedText(null), 2000);
  }, []);

  return { copiedText, copyToClipboard };
};
