import type { Settlement } from "../../shared/types";
import { shortHash } from "../../shared/utils";
import "./SettlementPlanTab.css";

type SettlementPlanTabProps = {
  settlements: Settlement[];
};

export default function SettlementPlanTab({ settlements }: SettlementPlanTabProps) {
  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Minimal Settlement Plan</h2>
            <p className="panel-subtitle">
              The app reduces unnecessary transfers by netting balances.
            </p>
          </div>
          <button className="btn btn-primary">Generate Plan</button>
        </div>

        <div className="plan-list">
          {settlements.map((settlement) => (
            <div key={settlement.id} className="plan-card">
              <div>
                <div className="plan-title">
                  {settlement.from} pays {settlement.to}
                </div>
                <div className="plan-meta">
                  {settlement.status === "Verified"
                    ? `Verified on-chain • ${shortHash(settlement.txHash)}`
                    : "Awaiting payment and verification"}
                </div>
              </div>

              <div className="plan-right">
                <div className="plan-amount">${settlement.amount.toFixed(2)}</div>
                <button
                  className={`btn ${settlement.status === "Verified" ? "btn-secondary btn-small" : "btn-primary btn-small"}`}
                >
                  {settlement.status === "Verified" ? "View Proof" : "Pay Now"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Verification Flow</h2>
            <p className="panel-subtitle">
              Backend checks the transaction hash and stores it as proof.
            </p>
          </div>
        </div>

        <div className="timeline">
          <div className="timeline-item">
            <div className="timeline-dot" />
            <div>
              <div className="timeline-title">1. User clicks Pay Now</div>
              <div className="timeline-text">
                Recipient wallet address and exact amount are pre-filled.
              </div>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-dot" />
            <div>
              <div className="timeline-title">2. User signs with wallet</div>
              <div className="timeline-text">
                Funds remain non-custodial. The app never holds user money.
              </div>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-dot" />
            <div>
              <div className="timeline-title">3. Backend verifies tx hash</div>
              <div className="timeline-text">
                The transaction is checked on-chain and saved as proof of settlement.
              </div>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-dot" />
            <div>
              <div className="timeline-title">4. Cycle can be closed</div>
              <div className="timeline-text">
                Once all obligations are verified, the owner archives the settlement period.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}