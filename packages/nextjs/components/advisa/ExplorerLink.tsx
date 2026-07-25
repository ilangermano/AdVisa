"use client";

import { baseSepolia } from "viem/chains";
import { ArrowUpRightIcon } from "@heroicons/react/20/solid";

type ExplorerLinkProps = {
  value: string;
  type: "address" | "tx";
  label?: string;
  className?: string;
  shorten?: boolean;
};

const shortenValue = (value: string) => `${value.slice(0, 8)}...${value.slice(-6)}`;

export const ExplorerLink = ({ value, type, label, className = "", shorten = true }: ExplorerLinkProps) => {
  const explorerUrl = baseSepolia.blockExplorers.default.url;
  const text = label ?? (shorten ? shortenValue(value) : value);

  return (
    <a
      className={`explorer-link ${className}`.trim()}
      href={`${explorerUrl}/${type}/${value}`}
      rel="noreferrer"
      target="_blank"
      title={`View ${type === "tx" ? "transaction" : "address"} on BaseScan`}
    >
      <span>{text}</span>
      <ArrowUpRightIcon aria-hidden="true" />
    </a>
  );
};
