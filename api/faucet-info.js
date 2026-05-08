// api/faucet-info.js — Trả về số dư ví faucet (công khai, không lộ private key)

const { ethers } = require('ethers');

const RITUAL_RPC = 'https://rpc.ritualfoundation.org';
const CHAIN_ID   = 1979;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15'); // cache 15s

  try {
    const pk = process.env.FAUCET_PRIVATE_KEY;
    if (!pk) return res.status(200).json({ balance: '0' });

    const provider = new ethers.JsonRpcProvider(RITUAL_RPC, {
      chainId: CHAIN_ID,
      name:    'ritual-testnet',
    });
    const wallet  = new ethers.Wallet(pk, provider);
    const balance = await provider.getBalance(wallet.address);

    return res.status(200).json({
      balance: ethers.formatEther(balance),
      // KHÔNG trả về wallet.address để tránh lộ địa chỉ faucet
    });
  } catch (err) {
    return res.status(200).json({ balance: '0' });
  }
}
