package settlementplan

import "testing"

func TestBuildSettlementPlan(t *testing.T) {
	balances := []MemberBalance{
		{WalletAddress: "0xaaa0000000000000000000000000000000000001", DisplayName: "Avery", Balance: 60},
		{WalletAddress: "0xbbb0000000000000000000000000000000000002", DisplayName: "Blake", Balance: -20},
		{WalletAddress: "0xccc0000000000000000000000000000000000003", DisplayName: "Casey", Balance: -40},
	}

	settlements := buildSettlementPlan(balances)
	if len(settlements) != 2 {
		t.Fatalf("expected 2 settlements, got %d", len(settlements))
	}

	if settlements[0].FromWalletAddress != "0xccc0000000000000000000000000000000000003" {
		t.Fatalf("expected largest debtor first, got %s", settlements[0].FromWalletAddress)
	}
	if settlements[0].ToWalletAddress != "0xaaa0000000000000000000000000000000000001" {
		t.Fatalf("expected creditor to be Avery, got %s", settlements[0].ToWalletAddress)
	}
	if settlements[0].Amount != 40 {
		t.Fatalf("expected first settlement amount to be 40, got %v", settlements[0].Amount)
	}

	if settlements[1].FromWalletAddress != "0xbbb0000000000000000000000000000000000002" {
		t.Fatalf("expected second debtor to be Blake, got %s", settlements[1].FromWalletAddress)
	}
	if settlements[1].Amount != 20 {
		t.Fatalf("expected second settlement amount to be 20, got %v", settlements[1].Amount)
	}
}
