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
              Shared expenses made simple
            </div>
          </div>
        </div>
        <button
        className="home-nav-link"
        type="button"
        onClick={() => void handleConnectWallet()}
        disabled={walletLoading}
        >
        {walletLoading ? "Getting Started..." : "Get Started"}
        </button>
      </nav>

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">SettleMint</p>

          <h1 className="home-title">
            Split expenses without the awkward follow-up.
          </h1>

          <p className="home-description">
            SettleMint helps roommates, classmates, teams, and friend groups keep
            shared expenses organized. Add costs, see who owes what, and get everyone
            settled up with less confusion.
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


      </section>

      <section className="home-feature-grid">
        <article className="home-feature-card">
        <div className="home-feature-number">01</div>
        <h2>Add shared costs</h2>
        <p>
            Keep rent, trips, meals, supplies, and other group expenses in one
            organized place.
        </p>
        </article>

        <article className="home-feature-card">
        <div className="home-feature-number">02</div>
        <h2>See who owes what</h2>
        <p>
            SettleMint helps turn messy group balances into a simple plan everyone
            can understand.
        </p>
        </article>

        <article className="home-feature-card">
        <div className="home-feature-number">03</div>
        <h2>Pay expenses on-chain</h2>
        <p>
            Settle up directly through your wallet and keep a clear record of completed
            payments.
        </p>
        </article>

        <article className="home-feature-card">
        <div className="home-feature-number">04</div>
        <h2>Keep clear records</h2>
        <p>
            Once payments are made, your group can keep a reliable record of what
            was settled.
        </p>
        </article>
      </section>
    </main>
  );
}