"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AdvisaCtx = {
  paid: boolean;
  setPaid: (v: boolean) => void;
  paidSlug: string;
  setPaidSlug: (slug: string) => void;
  seededApproved: boolean;
  setSeededApproved: (v: boolean) => void;
  clearAll: () => void;
};

export const AdvisaContext = createContext<AdvisaCtx>({
  paid: false,
  setPaid: () => {},
  paidSlug: "",
  setPaidSlug: () => {},
  seededApproved: false,
  setSeededApproved: () => {},
  clearAll: () => {},
});

export const useAdvisa = () => useContext(AdvisaContext);

export const AdvisaProvider = ({ children }: { children: React.ReactNode }) => {
  const [paid, setPaidState] = useState(false);
  const [paidSlug, setPaidSlugState] = useState("");
  const [seededApproved, setSeededApprovedState] = useState(false);

  useEffect(() => {
    setPaidState(localStorage.getItem("advisa_paid") === "true");
    setPaidSlugState(localStorage.getItem("advisa_paid_slug") ?? "");
    setSeededApprovedState(localStorage.getItem("advisa_seeded_approved") === "true");
  }, []);

  const setPaid = (v: boolean) => {
    setPaidState(v);
    localStorage.setItem("advisa_paid", String(v));
  };
  const setPaidSlug = (slug: string) => {
    setPaidSlugState(slug);
    localStorage.setItem("advisa_paid_slug", slug);
  };
  const setSeededApproved = (v: boolean) => {
    setSeededApprovedState(v);
    localStorage.setItem("advisa_seeded_approved", String(v));
  };
  const clearAll = () => {
    setPaid(false);
    setPaidSlug("");
    setSeededApproved(false);
  };

  return (
    <AdvisaContext.Provider
      value={{ paid, setPaid, paidSlug, setPaidSlug, seededApproved, setSeededApproved, clearAll }}
    >
      {children}
    </AdvisaContext.Provider>
  );
};
