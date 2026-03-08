import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, Trash2 } from "lucide-react";
import { getCustomTokens, saveCustomToken, removeCustomToken, getRandomColor, type CustomToken } from "@/lib/custom-tokens";
import { getActiveRpc } from "@/lib/network-config";
import { useToast } from "@/hooks/use-toast";

interface ImportTokenModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const ImportTokenModal = ({ open, onClose, onImported }: ImportTokenModalProps) => {
  const [address, setAddress] = useState("");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTokenInfo = async (contractAddress: string) => {
    setLoading(true);
    try {
      const rpc = await getActiveRpc();
      if (!rpc) throw new Error("No RPC");

      // ERC-20 symbol() = 0x95d89b41, name() = 0x06fdde03, decimals() = 0x313ce567
      const calls = [
        { method: "0x95d89b41", setter: setSymbol },
        { method: "0x06fdde03", setter: setName },
        { method: "0x313ce567", setter: null },
      ];

      for (const call of calls) {
        try {
          const res = await fetch(rpc, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_call",
              params: [{ to: contractAddress, data: call.method }, "latest"],
              id: 1,
            }),
          });
          const data = await res.json();
          if (data.result && data.result !== "0x") {
            if (call.method === "0x313ce567") {
              setDecimals(String(parseInt(data.result, 16)));
            } else {
              // Decode string: skip offset (32 bytes) + length (32 bytes), read the string
              const hex = data.result.slice(2);
              if (hex.length >= 128) {
                const len = parseInt(hex.slice(64, 128), 16);
                const strHex = hex.slice(128, 128 + len * 2);
                const decoded = strHex.match(/.{2}/g)?.map((b: string) => String.fromCharCode(parseInt(b, 16))).join("") || "";
                call.setter?.(decoded);
              }
            }
          }
        } catch {
          // Individual call failed, user can fill manually
        }
      }
    } catch {
      toast({ title: "Could not auto-detect token info", description: "Fill in the details manually." });
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
      fetchTokenInfo(value);
    }
  };

  const handleImport = () => {
    if (!address || !symbol || !name) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      toast({ title: "Invalid contract address", variant: "destructive" });
      return;
    }

    const token: CustomToken = {
      contractAddress: address,
      symbol: symbol.toUpperCase(),
      name,
      decimals: parseInt(decimals) || 18,
      color: getRandomColor(),
    };

    saveCustomToken(token);
    toast({ title: `${token.symbol} imported!` });
    setAddress("");
    setSymbol("");
    setName("");
    setDecimals("18");
    onImported();
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-foreground">Import Token</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contract Address *</label>
              <input
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="0x..."
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 size={14} className="animate-spin" />
                Auto-detecting token info...
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Symbol *</label>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g. USDC"
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Decimals</label>
                <input
                  value={decimals}
                  onChange={(e) => setDecimals(e.target.value)}
                  placeholder="18"
                  type="number"
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Token Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. USD Coin"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground font-display font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            Import Token
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface TokenManagerProps {
  onTokensChanged: () => void;
}

export const TokenManager = ({ onTokensChanged }: TokenManagerProps) => {
  const [showModal, setShowModal] = useState(false);
  const customTokens = getCustomTokens();
  const { toast } = useToast();

  const handleRemove = (token: CustomToken) => {
    removeCustomToken(token.contractAddress);
    toast({ title: `${token.symbol} removed` });
    onTokensChanged();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Custom Tokens</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={16} />
          Import
        </button>
      </div>

      {customTokens.length > 0 && (
        <div className="space-y-2 mb-4">
          {customTokens.map((token) => (
            <div
              key={token.contractAddress}
              className="flex items-center gap-3 bg-card rounded-xl p-3"
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center text-xs font-bold text-foreground`}>
                {token.symbol.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{token.symbol}</p>
                <p className="text-xs text-muted-foreground truncate">{token.contractAddress}</p>
              </div>
              <button
                onClick={() => handleRemove(token)}
                className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ImportTokenModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onImported={onTokensChanged}
      />
    </>
  );
};

export default ImportTokenModal;
