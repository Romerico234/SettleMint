import type { Member, Settlement } from "../../shared/types";
import { buildSettlementTransactionUrl } from "../../lib/settlementChain";

type SettlementPlanTabProps = {
  members: Member[];
  settlements: Settlement[];
  selectedCycleName: string | null;
  loading: boolean;
  errorMessage: string | null;
  currentWalletAddress: string | null;
  paymentPendingIDs: string[];
  paymentErrorMessage: string | null;
  paymentConfigured: boolean;
  paymentSetupMessage: string;
  paymentRailLabel: string;
  paymentAssetSymbol: string;
  transactionHashesBySettlementID: Record<string, string>;
  onPaySettlement: (settlement: Settlement) => void;
};

export default function SettlementPlanTab({
  members,
  settlements,
  selectedCycleName,
  loading,
  errorMessage,
  currentWalletAddress,
  paymentPendingIDs,
  paymentErrorMessage,
  paymentConfigured,
  paymentSetupMessage,
  paymentRailLabel,
  paymentAssetSymbol,
  transactionHashesBySettlementID,
  onPaySettlement,
}: SettlementPlanTabProps) {
  const normalizedCurrentWalletAddress = currentWalletAddress?.toLowerCase() ?? null;

  return (
    <section className="dashboard-grid dashboard-grid-body">
      <article className="dashboard-card section-card section-card-full">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Settlement Plan</h3>
            <p className="section-card-copy">
              The minimal repayment plan for the current Settlement Cycle will appear here.
            </p>
            <p className="row-copy settlement-rail-copy">Payment rail: {paymentRailLabel}</p>
          </div>
        </div>
        <p
          className={`empty-copy settlement-setup-copy ${
            paymentConfigured ? "" : "settlement-setup-copy-warning"
          }`}
        >
          {paymentSetupMessage}
        </p>
        {errorMessage && <p className="section-error">{errorMessage}</p>}
        {paymentErrorMessage && <p className="section-error">{paymentErrorMessage}</p>}
        {!selectedCycleName ? (
          <p className="empty-copy">Choose a Settlement Cycle to generate a settlement plan.</p>
        ) : loading ? (
          <p className="empty-copy">Computing balances and the minimal settlement path...</p>
        ) : members.length === 0 ? (
          <p className="empty-copy">Add expenses to compute balances and generate a plan.</p>
        ) : (
          <div className="settlement-layout">
            <div className="settlement-column">
              <h4 className="settlement-column-title">Net Balances</h4>
              <div className="simple-list">
                {members.map((member) => (
                  <div className="simple-row" key={member.walletAddress}>
                    <div>
                      <strong>{member.displayName.trim() || shortWallet(member.walletAddress)}</strong>
                      <p className="row-copy">
                        Paid ${member.totalPaid.toFixed(2)} • Owes ${member.totalOwed.toFixed(2)}
                      </p>
                    </div>
                    <strong className={member.balance >= 0 ? "amount-positive" : "amount-negative"}>
                      {member.balance >= 0 ? "+" : "-"}${Math.abs(member.balance).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="settlement-column">
              <h4 className="settlement-column-title">Repayment Steps</h4>
              {settlements.length > 0 ? (
                <div className="simple-list">
                  {settlements.map((settlement) => {
                    const transactionHash = transactionHashesBySettlementID[settlement.id];
                    const isSubmitting = paymentPendingIDs.includes(settlement.id);
                    const canPayNow =
                      paymentConfigured &&
                      settlement.status !== "Verified" &&
                      !transactionHash &&
                      normalizedCurrentWalletAddress ===
                        settlement.fromWalletAddress.toLowerCase();
                    const transactionUrl = transactionHash
                      ? buildSettlementTransactionUrl(transactionHash)
                      : null;

                    return (
                      <div className="simple-row" key={settlement.id}>
                        <div>
                          <strong>
                            {settlement.fromDisplayName.trim() ||
                              shortWallet(settlement.fromWalletAddress)}{" "}
                            pays{" "}
                            {settlement.toDisplayName.trim() ||
                              shortWallet(settlement.toWalletAddress)}
                          </strong>
                          <p className="row-copy">
                            {transactionHash
                              ? "Transaction submitted from wallet"
                              : settlement.status}
                          </p>
                          <p className="row-copy">
                            Wallet transfer target: {settlement.amount.toFixed(2)} {paymentAssetSymbol}
                          </p>
                          {transactionHash && (
                            <p className="row-copy settlement-transaction-copy">
                              Tx Hash:{" "}
                              {transactionUrl ? (
                                <a
                                  className="settlement-transaction-link"
                                  href={transactionUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {shortTransactionHash(transactionHash)}
                                </a>
                              ) : (
                                shortTransactionHash(transactionHash)
                              )}
                            </p>
                          )}
                        </div>

                        <div className="settlement-row-actions">
                          <strong>${settlement.amount.toFixed(2)}</strong>
                          {canPayNow ? (
                            <button
                              className="primary-chip"
                              type="button"
                              onClick={() => onPaySettlement(settlement)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? "Opening Wallet..." : "Pay Now"}
                            </button>
                          ) : transactionHash ? (
                            <span className="pill settlement-status-pill settlement-status-pill-submitted">
                              Submitted
                            </span>
                          ) : settlement.status === "Verified" ? (
                            <span className="pill settlement-status-pill settlement-status-pill-verified">
                              Verified
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-copy">
                  Everyone in {selectedCycleName} is already balanced. No repayments are needed.
                </p>
              )}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

function shortWallet(walletAddress: string) {
  if (!walletAddress) {
    return "Unknown wallet";
  }

  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`;
}

function shortTransactionHash(transactionHash: string) {
  if (!transactionHash) {
    return "Unknown transaction";
  }

  return `${transactionHash.slice(0, 10)}...${transactionHash.slice(-6)}`;
}
