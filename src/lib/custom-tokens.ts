export interface CustomToken {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  color: string;
}

const STORAGE_KEY = "gyds_custom_tokens";

const GRADIENT_COLORS = [
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-yellow-500",
  "from-lime-400 to-green-500",
  "from-teal-400 to-emerald-500",
  "from-sky-400 to-blue-500",
  "from-orange-400 to-red-500",
  "from-fuchsia-400 to-pink-500",
];

export const getCustomTokens = (): CustomToken[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveCustomToken = (token: CustomToken): void => {
  const tokens = getCustomTokens();
  const existing = tokens.findIndex(
    (t) => t.contractAddress.toLowerCase() === token.contractAddress.toLowerCase()
  );
  if (existing >= 0) {
    tokens[existing] = token;
  } else {
    tokens.push(token);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
};

export const removeCustomToken = (contractAddress: string): void => {
  const tokens = getCustomTokens().filter(
    (t) => t.contractAddress.toLowerCase() !== contractAddress.toLowerCase()
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
};

export const getRandomColor = (): string => {
  return GRADIENT_COLORS[Math.floor(Math.random() * GRADIENT_COLORS.length)];
};
