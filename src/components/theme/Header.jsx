import Image from "next/image";
import Link from "next/link";
import AccountMenu from "@/components/theme/AccountMenu";
import HeaderShell from "@/components/theme/HeaderShell";
import SearchForm from "@/components/theme/SearchForm";

/**
 * Rendered once by the root layout.
 *
 * @param {object} props
 * @param {Array<object>} [props.categories] Category list from the dashboard API.
 *   `<SearchForm />` decides for itself which routes show the hero search.
 */
export default function Header({ categories = [] }) {
  return (
    <HeaderShell>
      <div className="header-top">
        <div className="container">
          <div className="row justify-content-between align-items-center">
            <div className="col-auto header-top-left">
              <Link className="header-logo" href="/">
                <Image src="/images/logo.svg" alt="Legally" width={160} height={37} priority />
              </Link>
            </div>

            <div className="col-auto header-top-right">
              <div className="header-right">
                <AccountMenu />
              </div>
            </div>
          </div>
        </div>
      </div>

      <SearchForm categories={categories} />
    </HeaderShell>
  );
}
