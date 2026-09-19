"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={copy} style={{ width: "auto", padding: "0.4rem 0.85rem" }}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
