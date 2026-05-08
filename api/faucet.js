// api/faucet.js — Vercel Serverless Function
// Private key chỉ nằm trong env var FAUCET_PRIVATE_KEY, không bao giờ lộ ra frontend

const { ethers } = require('ethers');

const RITUAL_RPC     = 'https://rpc.ritualfoundation.org';
const CHAIN_ID       = 1979;
const AMOUNT_RITUAL  = '0.01';                  // số RITUAL testnet gửi mỗi lần faucet
const COOLDOWN_MS    = 24 * 60 * 60 * 1000;     // 24h tính theo timestamp

// In-memory store (đủ dùng cho Vercel serverless; reset mỗi lần cold start)
// Nếu muốn bền vững hơn thì dùng Vercel KV / Upstash Redis
const rateLimit = new Map(); // address -> lastClaimTimestamp (ms)

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body || {};

  // Validate địa chỉ
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const normalized = address.toLowerCase();
  const now        = Date.now();
  const lastClaim  = rateLimit.get(normalized) || 0;
  const elapsed    = now - lastClaim;

  // Kiểm tra 24h cooldown
  if (elapsed < COOLDOWN_MS) {
    const remainMs  = COOLDOWN_MS - elapsed;
    const remainH   = Math.floor(remainMs / 3600000);
    const remainM   = Math.floor((remainMs % 3600000) / 60000);
    return res.status(429).json({
      error: `Rate limit: wait ${remainH}h ${remainM}m before next claim`,
      nextClaim: new Date(lastClaim + COOLDOWN_MS).toISOString(),
    });
  }

  // Kiểm tra private key env
  const pk = process.env.FAUCET_PRIVATE_KEY;
  if (!pk) {
    return res.status(500).json({ error: 'Faucet not configured (missing env var)' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RITUAL_RPC, {
      chainId: CHAIN_ID,
      name:    'ritual-testnet',
    });
    const wallet = new ethers.Wallet(pk, provider);

    // Kiểm tra số dư ví faucet
    const balance = await provider.getBalance(wallet.address);
    const amount  = ethers.parseEther(AMOUNT_RITUAL);

    if (balance < amount) {
      return res.status(503).json({ error: 'Faucet empty. Please try again later.' });
    }

    // Gửi transaction
    const tx = await wallet.sendTransaction({
      to:    address,
      value: amount,
    });

    // Ghi cooldown NGAY SAU KHI tx được gửi (không chờ confirm để tránh timeout)
    rateLimit.set(normalized, now);

    return res.status(200).json({
      success:   true,
      txHash:    tx.hash,
      amount:    AMOUNT_RITUAL,
      recipient: address,
      nextClaim: new Date(now + COOLDOWN_MS).toISOString(),
      explorer:  `https://explorer.ritualfoundation.org/tx/${tx.hash}`,
    });

  } catch (err) {
    console.error('Faucet error:', err);
    return res.status(500).json({
      error: err?.shortMessage || err?.message || 'Transaction failed',
    });
  }
}
