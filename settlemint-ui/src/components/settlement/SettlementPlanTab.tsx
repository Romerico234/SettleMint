import type { Member, Settlement } from "../../shared/types";

type SettlementPlanTabProps = {
  members: Member[];
  settlements: Settlement[];
  selectedCycleName: string | null;
  loading: boolean;
  errorMessage: string | null;
};

export default function SettlementPlanTab({
  members,
  settlements,
  selectedCycleName,
  loading,
  errorMessage,
}: SettlementPlanTabProps) {
  return (
    <section className="dashboard-grid dashboard-grid-body">
      <article className="dashboard-card section-card section-card-full">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Settlement Plan</h3>
            <p className="section-card-copy">
              The minimal repayment plan for the current Settlement Cycle will appear here.
            </p>
          </div>
        </div>
        {errorMessage && <p className="section-error">{errorMessage}</p>}
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
                  {settlements.map((settlement) => (
                    <div className="simple-row" key={settlement.id}>
                      <div>
                        <strong>
                          {settlement.fromDisplayName.trim() || shortWallet(settlement.fromWalletAddress)} pays{" "}
                          {settlement.toDisplayName.trim() || shortWallet(settlement.toWalletAddress)}
                        </strong>
                        <p className="row-copy">{settlement.status}</p>
                      </div>
                      <strong>${settlement.amount.toFixed(2)}</strong>
                    </div>
                  ))}
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
