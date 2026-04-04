import { useEffect, useState } from "react";
import BalanceCard from "@/components/wallet/BalanceCard";
import PortfolioChart from "@/components/wallet/PortfolioChart";
import AssetsList from "@/components/wallet/AssetsList";
import RecentTransactions from "@/components/wallet/RecentTransactions";
import BottomNav from "@/components/wallet/BottomNav";
import PwaInstallBanner from "@/components/wallet/PwaInstallBanner";
import AccountSwitcher from "@/components/wallet/AccountSwitcher";
import ChainSelector from "@/components/wallet/ChainSelector";
import TokenDiscovery from "@/components/wallet/TokenDiscovery";
import { Bell, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { initializeAccounts } from "@/lib/multi-account";
import { getWalletAddress } from "@/lib/wallet-core";
import { recordActivity } from "@/lib/session-lock";

const Index = () => {
  const [chainKey, setChainKey] = useState(0);

  useEffect(() => {
    const addr = getWalletAddress();
    if (addr) initializeAccounts(addr);
    recordActivity();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ChainSelector onChainChange={() => setChainKey((k) => k + 1)} />
          </div>
          <div className="flex items-center gap-2">
            <AccountSwitcher />
            <button className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full gradient-primary" />
            </button>
            <Link to="/settings" className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Settings size={20} />
            </Link>
          </div>
        </div>

        <div className="mb-8" key={`bal-${chainKey}`}><BalanceCard /></div>
        <div className="mb-8"><PortfolioChart /></div>
        <TokenDiscovery onTokensChanged={() => setChainKey((k) => k + 1)} />
        <div className="mb-8" key={`assets-${chainKey}`}><AssetsList /></div>
        <div className="mb-8"><RecentTransactions /></div>
      </div>

      <PwaInstallBanner />
      <BottomNav />
    </div>
  );
};

export default Index;
