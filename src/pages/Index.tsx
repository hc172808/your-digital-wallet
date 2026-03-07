import BalanceCard from "@/components/wallet/BalanceCard";
import PortfolioChart from "@/components/wallet/PortfolioChart";
import AssetsList from "@/components/wallet/AssetsList";
import RecentTransactions from "@/components/wallet/RecentTransactions";
import BottomNav from "@/components/wallet/BottomNav";
import { Bell, Settings } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h2 className="text-xl font-display font-bold text-foreground">CryptoWallet</h2>
          </div>
          <button className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full gradient-primary" />
          </button>
        </div>

        {/* Balance */}
        <div className="mb-8">
          <BalanceCard />
        </div>

        {/* Portfolio Chart */}
        <div className="mb-8">
          <PortfolioChart />
        </div>

        {/* Assets */}
        <div className="mb-8">
          <AssetsList />
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <RecentTransactions />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
