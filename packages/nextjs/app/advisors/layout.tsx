"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Avatar } from "~~/components/advisa/Avatar";
import { advisors, formatMoney, getMilestones } from "~~/components/advisa/advisors";
import { AdvisaProvider, useAdvisa } from "~~/contexts/AdvisaContext";

const seededAdvisor = advisors[1];
const seededMilestones = getMilestones(seededAdvisor);

const Topbar = () => {
  const { logout, user, ready, authenticated } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const { seededApproved, clearAll } = useAdvisa();
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) router.replace("/sign-in");
  }, [ready, authenticated, router]);

  const displayEmail =
    user?.google?.email ?? user?.email?.address ?? (user?.phone?.number ? user.phone.number : null) ?? "Account";

  const handleSignOut = async () => {
    clearAll();
    await logout();
    router.push("/");
  };

  const notifCount = seededApproved ? 0 : 1;
  const isApplications = pathname.startsWith("/advisors/applications");
  const isMarket =
    !isApplications &&
    pathname !== "/advisors/account" &&
    (pathname === "/advisors" || pathname.startsWith("/advisors/"));

  return (
    <header className="app-topbar">
      <Link className="advisa-logo app-logo-button" href="/advisors">
        <span className="advisa-logo__mark">A</span>
        <span className="advisa-logo__word">Advisa</span>
      </Link>
      <nav aria-label="Application navigation">
        <Link className={isMarket ? "app-tab app-tab--active" : "app-tab"} href="/advisors">
          Find advisers
        </Link>
        <Link className={isApplications ? "app-tab app-tab--active" : "app-tab"} href="/advisors/applications">
          My Applications
          {notifCount > 0 && <span className="app-tab__badge">{notifCount}</span>}
        </Link>
      </nav>
      <div className="app-topbar__help">
        <div className="notif-wrapper">
          <button
            className="notif-bell-button"
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifOpen(o => !o)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
          </button>
          {notifOpen && (
            <div className="notif-dropdown" role="menu">
              <div className="notif-dropdown__header">Notifications</div>
              {notifCount === 0 ? (
                <div className="notif-empty">All caught up ✓</div>
              ) : (
                <Link
                  className="notif-item"
                  href="/advisors/applications/amara"
                  role="menuitem"
                  onClick={() => setNotifOpen(false)}
                >
                  <div className="notif-item__dot" />
                  <div>
                    <strong>Action needed</strong>
                    <p>
                      Amara Osei uploaded your INZ lodgement receipt — approve to release{" "}
                      {formatMoney(seededMilestones.filing)}.
                    </p>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
        <Link className="app-topbar__profile-btn" href="/advisors/account">
          <span>{displayEmail}</span>
          <Avatar size="small" />
        </Link>
        <button className="app-signout-button" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
};

export default function AdvisorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdvisaProvider>
      <div className="advisors-app">
        <Topbar />
        {children}
      </div>
    </AdvisaProvider>
  );
}
