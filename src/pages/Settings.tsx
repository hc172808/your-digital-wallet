import { motion } from "framer-motion";
import { User, Shield, Bell, Moon, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import BottomNav from "@/components/wallet/BottomNav";

const SETTINGS = [
  { icon: User, label: "Profile", desc: "Manage your account" },
  { icon: Shield, label: "Security", desc: "2FA, biometrics, backup" },
  { icon: Bell, label: "Notifications", desc: "Alerts & push settings" },
  { icon: Moon, label: "Appearance", desc: "Theme & display" },
  { icon: HelpCircle, label: "Help & Support", desc: "FAQ & contact us" },
];

const Settings = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-display font-bold text-foreground mb-6">Settings</h1>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 mb-6 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-xl font-display font-bold text-primary-foreground">
            W
          </div>
          <div>
            <p className="font-semibold text-foreground">Wallet User</p>
            <p className="text-sm text-muted-foreground">wallet@example.com</p>
          </div>
        </motion.div>

        <div className="space-y-1">
          {SETTINGS.map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-card transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                <item.icon size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full mt-8 flex items-center justify-center gap-2 text-destructive hover:text-destructive/80 transition-colors py-3"
        >
          <LogOut size={18} />
          <span className="font-semibold">Log Out</span>
        </motion.button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Settings;
