# Ritual Lily Milly — Spin Faucet

## Luồng hoạt động

User chọn ví **MetaMask / OKX / Rabby** → app kết nối ví và switch sang **Ritual Chain Testnet (Chain ID 1979)** → user bấm **SPIN** → frontend gọi `POST /api/faucet` → serverless function dùng `FAUCET_PRIVATE_KEY` để gửi **0.01 RITUAL testnet** từ ví faucet/burner của bạn sang ví user.

> Không đưa private key vào frontend. Chỉ lưu private key trong Vercel Environment Variables.

---

## Cấu trúc project

```
ritual-faucet/
├── index.html
├── package.json
├── vercel.json
├── api/
│   ├── faucet.js
│   └── faucet-info.js
└── README.md
```

---

## Deploy lên Vercel

### Bước 1 — Push lên GitHub

```bash
git init
git add .
git commit -m "feat: ritual spin faucet"
git remote add origin https://github.com/YOUR_USERNAME/ritual-faucet.git
git push -u origin main
```

### Bước 2 — Import vào Vercel

1. Vào Vercel → Add New Project
2. Import repo
3. Framework Preset: **Other**
4. Deploy

### Bước 3 — Thêm Environment Variable

Vào **Vercel Dashboard → Project → Settings → Environment Variables**:

```txt
Name: FAUCET_PRIVATE_KEY
Value: private key ví faucet/burner, bắt đầu bằng 0x...
Environment: Production
```

Sau đó **Redeploy** project.

---

## Test nhanh sau khi deploy

1. Mở website trên Vercel.
2. Bấm **Connect Wallet**.
3. Chọn **MetaMask**, **OKX Wallet**, hoặc **Rabby Wallet**.
4. Ví sẽ yêu cầu connect và switch/add Ritual Chain.
5. Bấm **SPIN**.
6. Nếu ví faucet còn token, user nhận `0.01 RITUAL`.
7. Bấm **DISCONNECT** để xóa trạng thái ví khỏi UI. Nếu ví hỗ trợ `wallet_revokePermissions`, quyền kết nối cũng được revoke.

---

## Tính năng đã có

| Tính năng | Mô tả |
|---|---|
| Spin faucet | Spin xong backend gửi token từ ví faucet của bạn |
| Multi-wallet | Hỗ trợ MetaMask, OKX Wallet, Rabby |
| Disconnect | Có nút disconnect ví |
| Auto network | Tự switch/add Ritual Chain Testnet (Chain ID 1979) |
| Faucet balance | `/api/faucet-info` trả số dư ví faucet |
| Rate limit | Mỗi địa chỉ ví nhận 1 lần / 24h |
| Private key an toàn | Chỉ nằm trong Vercel env var |

---

## Lưu ý bảo mật

- Chỉ dùng ví faucet/burner, không dùng ví chính.
- Chỉ nạp ít token testnet vào ví faucet.
- Không commit `.env`, private key, seed phrase lên GitHub.
- In-memory rate limit có thể reset khi Vercel cold start. Nếu cần chống spam bền hơn, dùng Vercel KV hoặc Upstash Redis.

---

## Nếu token Ritual là ERC-20

Code hiện tại gửi **native RITUAL** bằng `wallet.sendTransaction({ value })`. Nếu bạn muốn faucet một ERC-20 token riêng, cần đổi backend sang:

```js
const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);
await token.transfer(address, amount);
```

Khi đó cần thêm `TOKEN_ADDRESS`, ABI ERC-20 và số decimals chính xác.


## UI consistency check

- Frontend displays Chain ID `1979`.
- Spin reward text matches backend amount: `AMOUNT_RITUAL = 0.01` RITUAL.
- Stats label uses `FAUCET WALLET BALANCE`, not old contract treasury wording.
- Old on-chain `tap()`, `claimStarterGas()`, and donate UI actions were removed from the page.
- Cooldown is enforced by `/api/faucet` for 24 hours per address.
