import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, User, ChevronDown, ChevronUp } from "lucide-react";
import { getWalletAddress } from "@/lib/wallet-core";

interface ChatMessage {
  id: string;
  address: string;
  text: string;
  timestamp: number;
}

const CHAT_STORAGE_PREFIX = "gyds_token_chat_";
const MAX_MESSAGE_LENGTH = 280;

const getMessages = (symbol: string): ChatMessage[] => {
  try {
    const stored = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${symbol.toLowerCase()}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveMessage = (symbol: string, msg: ChatMessage): void => {
  const messages = getMessages(symbol);
  messages.push(msg);
  // Keep last 100 messages per token
  if (messages.length > 100) messages.splice(0, messages.length - 100);
  localStorage.setItem(`${CHAT_STORAGE_PREFIX}${symbol.toLowerCase()}`, JSON.stringify(messages));
};

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  
  if (diffMs < 60000) return "just now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
};

interface TokenChatProps {
  symbol: string;
  tokenName: string;
}

const TokenChat = ({ symbol, tokenName }: TokenChatProps) => {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const wallet = getWalletAddress();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(getMessages(symbol));
    // Poll for new messages every 10s
    const interval = setInterval(() => setMessages(getMessages(symbol)), 10000);
    return () => clearInterval(interval);
  }, [symbol]);

  useEffect(() => {
    if (expanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, expanded]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !wallet) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      address: wallet,
      text,
      timestamp: Date.now(),
    };

    saveMessage(symbol, msg);
    setMessages(getMessages(symbol));
    setInput("");
  };

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const isOwn = (addr: string) => wallet?.toLowerCase() === addr.toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mb-6"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-1 mb-3"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {tokenName} Chat
          </h2>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {messages.length}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-2xl overflow-hidden">
              {/* Messages area */}
              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <MessageCircle size={24} className="mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Be the first to talk about {symbol}!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn(msg.address) ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] ${isOwn(msg.address) ? "order-2" : ""}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            isOwn(msg.address) ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                          }`}>
                            <User size={10} />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {isOwn(msg.address) ? "You" : shortAddr(msg.address)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">{formatTime(msg.timestamp)}</span>
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-sm ${
                          isOwn(msg.address)
                            ? "bg-primary/15 text-foreground"
                            : "bg-secondary text-foreground"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={wallet ? `Message about ${symbol}...` : "Connect wallet to chat"}
                  disabled={!wallet}
                  className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !wallet}
                  className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity"
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="px-3 pb-2">
                <span className="text-[10px] text-muted-foreground/50">{input.length}/{MAX_MESSAGE_LENGTH}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TokenChat;
