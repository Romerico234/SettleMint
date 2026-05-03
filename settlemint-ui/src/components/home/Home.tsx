import { useEffect } from "react";
import type { UserProfile } from "../../api/users";
import "./Home.css";

type HomeProps = {
  walletConnected: boolean;
  walletAddress: string | null;
  walletLoading: boolean;
  walletError: string | null;
  profile: UserProfile | null;
  onWalletAction: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onEnterDashboard: () => void;
};

function shortenWalletAddress(address: string | null) {
  if (!address) {
    return "MetaMask wallet required";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Home({
  walletConnected,
  walletAddress,
  walletLoading,
  walletError,
  profile,
  onWalletAction,
  onDisconnect,
  onEnterDashboard,
}: HomeProps) {
  useEffect(() => {
    if (!walletConnected || walletLoading) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      onEnterDashboard();
    }, 900);

    return () => window.clearTimeout(redirectTimer);
  }, [walletConnected, walletLoading, onEnterDashboard]);

  async function handleConnectWallet() {
    await onWalletAction();
  }

  return (
    <main className="home-page">
      <div className="home-glow home-glow-one" />
      <div className="home-glow home-glow-two" />

      <nav className="home-nav">
        <div className="home-brand">
          <div className="home-brand-icon">S</div>
          <div>
            <div className="home-brand-title">SettleMint</div>
            <div className="home-brand-subtitle">
              Verifiable group expense settlement
            </div>
          </div>
        </div>

        <button className="home-nav-link" type="button" onClick={onEnterDashboard}>
          Dashboard
        </button>
      </nav>

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">SettleMint</p>

          <h1 className="home-title">
            Settle shared expenses with proof on-chain.
          </h1>

          <p className="home-description">
            SettleMint helps groups track shared expenses, calculate repayment
            plans, and verify wallet-to-wallet settlements using blockchain
            transaction proof. It is built for teams, classmates, roommates, and
            communities that want a clearer way to handle shared costs.
          </p>

          <div className="home-actions">
            {!walletConnected && (
              <button
                className="home-button home-button-primary"
                type="button"
                onClick={() => void handleConnectWallet()}
                disabled={walletLoading}
              >
                {walletLoading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}

            {walletConnected && (
              <button
                className="home-button home-button-primary"
                type="button"
                onClick={onEnterDashboard}
              >
                Enter Dashboard
              </button>
            )}

            {walletConnected && (
              <button
                className="home-button home-button-secondary"
                type="button"
                onClick={() => void onDisconnect()}
                disabled={walletLoading}
              >
                Sign Out
              </button>
            )}
          </div>

          {walletError && <p className="home-error">{walletError}</p>}
        </div>

        <aside className="home-wallet-card">
          <div className="home-card-label">Wallet Status</div>

          <div className="home-wallet-status-row">
            <span
              className={`home-status-dot ${
                walletConnected ? "connected" : "disconnected"
              }`}
            />
            <span>{walletConnected ? "Connected" : "Not Connected"}</span>
          </div>

          <div className="home-wallet-address">
            {shortenWalletAddress(walletAddress)}
          </div>

          {walletConnected && (
            <div className="home-profile-box">
              <div className="home-profile-label">Signed in as</div>
              <div className="home-profile-name">
                {profile?.displayName || "SettleMint user"}
              </div>
            </div>
          )}

          {!walletConnected && (
            <p className="home-wallet-help">
              Connect MetaMask to access your groups, expenses, settlement
              cycles, and repayment history.
            </p>
          )}
        </aside>
      </section>

      <section className="home-feature-grid">
        <article className="home-feature-card">
          <div className="home-feature-number">01</div>
          <h2>Track group expenses</h2>
          <p>
            Create or join groups, add shared expenses, and keep everyone’s
            balances organized in one place.
          </p>
        </article>

        <article className="home-feature-card">
          <div className="home-feature-number">02</div>
          <h2>Calculate repayments</h2>
          <p>
            Turn complicated group balances into a simpler settlement plan with
            clear payer and payee relationships.
          </p>
        </article>

        <article className="home-feature-card">
          <div className="home-feature-number">03</div>
          <h2>Verify on-chain</h2>
          <p>
            Submit wallet-to-wallet payments and preserve blockchain proof for
            transparent settlement records.
          </p>
        </article>
      </section>
    </main>
  );
}