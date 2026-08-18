"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { MY_ACCOUNT_TABS } from "@/lib/constants";
import MyOrders from "@/components/my-account/MyOrders";
import MyWishlist from "@/components/my-account/MyWishlist";
import AccountDetails from "@/components/my-account/AccountDetails";
import ManageAddress from "@/components/my-account/ManageAddress";
import Wallet from "@/components/my-account/Wallet";
import ChangePassword from "@/components/my-account/ChangePassword";

/** Tab id -> panel. Adding a tab means adding an entry here and in `MY_ACCOUNT_TABS`. */
const TAB_PANELS = {
  "my-bookings": MyOrders,
  "my-wishlist": MyWishlist,
  "account-details": AccountDetails,
  "my-address": ManageAddress,
  "my-wallet": Wallet,
  "change-password": ChangePassword,
};

const DEFAULT_TAB = MY_ACCOUNT_TABS[0].id;

export default function MyAccount() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const requestedTab = searchParams.get("tab");
  const currentTab = TAB_PANELS[requestedTab] ? requestedTab : DEFAULT_TAB;
  const ActivePanel = TAB_PANELS[currentTab];

  const handleTabClick = (tabId) => {
    setIsMobileMenuOpen(false);
    router.push(`/my-account?tab=${tabId}`);
  };

  return (
    <section className="my-account-sec">
      <div className="container">
        <div className="row">
          <div className="col-lg-3">
            <div className="my-acc-wrap">
              <div className="my-account-title">
                My Account
                {user?.first_name ? <span>Hi, {user.first_name}</span> : null}
              </div>

              <div className="tabing-boxes position-relative">
                <button
                  type="button"
                  className="my-account-dropdown-mob d-lg-none"
                  onClick={() => setIsMobileMenuOpen((open) => !open)}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="my-account-tablist"
                >
                  {MY_ACCOUNT_TABS.find((tab) => tab.id === currentTab)?.label}
                  <i className="icon icon-down-arrow" aria-hidden="true" />
                </button>

                <div
                  className={`my-account-tabing ${isMobileMenuOpen ? "show" : ""}`}
                  id="my-account-tablist"
                >
                  <div className="nav flex-column nav-pills" role="tablist" aria-orientation="vertical">
                    {MY_ACCOUNT_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        className={`nav-link ${currentTab === tab.id ? "active" : ""}`}
                        aria-selected={currentTab === tab.id}
                        onClick={() => handleTabClick(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="nav-link"
                      onClick={logout}
                      disabled={isLoading}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-9">
            <div className="my-account-details">
              <div className="tab-content">
                <div className="tab-pane fade show active" role="tabpanel">
                  <ActivePanel />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
