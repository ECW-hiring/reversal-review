import {
  createPublicClient,
  createWalletClient,
  encodePacked,
  formatEther,
  getContract,
  hexToBytes,
  http,
  keccak256,
  parseEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import deployment from "./deployment.json";
import { entitlementLedgerAbi } from "./ledgerAbi";
import type { DeploymentConfig } from "./ledgerAbi";
import { transferId } from "./ledgerscan";

const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545";

const ANVIL_KEYS = {
  operatorAlpha: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex,
  operatorBeta: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex,
  deskNorth: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as Hex,
  deskSouth: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" as Hex,
  deskEast: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a" as Hex,
};

export function getDeployment(): DeploymentConfig {
  return deployment as DeploymentConfig;
}

export function getPublicClient() {
  return createPublicClient({ chain: foundry, transport: http(RPC) });
}

function wallet(role: keyof typeof ANVIL_KEYS) {
  const account = privateKeyToAccount(ANVIL_KEYS[role]);
  return createWalletClient({ account, chain: foundry, transport: http(RPC) });
}

export function getLedgerContract() {
  const cfg = getDeployment();
  return getContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    client: { public: getPublicClient(), wallet: wallet("operatorAlpha") },
  });
}

async function signReverse(
  holderKey: Hex,
  id: Hex,
  holder: `0x${string}`,
  amount: bigint,
): Promise<Hex> {
  const account = privateKeyToAccount(holderKey);
  const inner = keccak256(
    encodePacked(["string", "bytes32", "address", "uint256"], ["REVERSE", id, holder, amount]),
  );
  const digest = keccak256(
    encodePacked(["string", "bytes32"], ["\x19Ethereum Signed Message:\n32", inner]),
  );
  return account.sign({ hash: digest });
}

export async function fetchOnChainPositions(): Promise<Record<string, bigint>> {
  const cfg = getDeployment();
  const ledger = getLedgerContract();
  const deskKeys = ["deskNorth", "deskSouth", "deskEast", "deskWest", "deskCentral"] as const;
  const entries: [string, bigint][] = await Promise.all(
    deskKeys
      .filter(key => cfg[key])
      .map(async key => {
        const addr = cfg[key]!;
        const bal = await ledger.read.positionsOf([addr]);
        return [addr.toLowerCase(), bal as bigint];
      }),
  );
  return Object.fromEntries(entries);
}

export async function fetchTotalReversed(): Promise<bigint> {
  const ledger = getLedgerContract();
  return ledger.read.totalReversed() as Promise<bigint>;
}

export async function fetchLedgerLogs(fromBlock = 0n) {
  const cfg = getDeployment();
  const client = getPublicClient();
  return client.getLogs({
    address: cfg.ledger,
    fromBlock,
    toBlock: "latest",
  });
}

export async function scenarioNormalTransfer() {
  const cfg = getDeployment();
  const id = transferId(`scenario-normal-${Date.now()}`);
  const amount = parseEther("25000");
  const w = wallet("deskNorth");
  const hash = await w.writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "transfer",
    args: [cfg.deskSouth, amount, id],
  });
  return { hash, transferId: id, amount: formatEther(amount) };
}

export async function scenarioErroneousReversal() {
  const cfg = getDeployment();
  const id = transferId(`scenario-reversal-${Date.now()}`);
  const amount = parseEther("40000");
  const north = wallet("deskNorth");
  await north.writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "transfer",
    args: [cfg.deskSouth, amount, id],
  });
  const sig = await signReverse(ANVIL_KEYS.deskSouth, id, cfg.deskSouth, amount);
  const op = wallet("operatorAlpha");
  const hash = await op.writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "reverseTransfer",
    args: [id, hexToBytes(sig)],
  });
  return { hash, transferId: id };
}

export async function scenarioReplayTwoOperators() {
  const cfg = getDeployment();
  const id = transferId(`scenario-replay-${Date.now()}`);
  const amount = parseEther("30000");
  await wallet("deskNorth").writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "transfer",
    args: [cfg.deskSouth, amount, id],
  });
  const sig = await signReverse(ANVIL_KEYS.deskSouth, id, cfg.deskSouth, amount);
  const sigBytes = hexToBytes(sig);
  await wallet("operatorAlpha").writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "reverseTransfer",
    args: [id, sigBytes],
  });
  // Second operator replays — guard is per-operator.
  const hash = await wallet("operatorBeta").writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "reverseTransfer",
    args: [id, sigBytes],
  });
  return { hash, transferId: id };
}

export async function scenarioPartialBatch() {
  const cfg = getDeployment();
  const goodId = transferId(`scenario-batch-good-${Date.now()}`);
  const alreadyReversedId = transferId(`scenario-batch-already-${Date.now()}`);
  const goodAmount = parseEther("15000");
  const priorAmount = parseEther("12000");

  await wallet("deskNorth").writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "transfer",
    args: [cfg.deskEast, goodAmount, goodId],
  });
  await wallet("deskNorth").writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "transfer",
    args: [cfg.deskSouth, priorAmount, alreadyReversedId],
  });

  // operatorAlpha already reversed this id — batch will increment totalReversed then fail on replay.
  await wallet("operatorAlpha").writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "batchReverse",
    args: [[alreadyReversedId]],
  });

  const hash = await wallet("operatorAlpha").writeContract({
    address: cfg.ledger,
    abi: entitlementLedgerAbi,
    functionName: "batchReverse",
    args: [[goodId, alreadyReversedId]],
  });
  return { hash, goodId, alreadyReversedId };
}

export async function readPublicPosition(participant: `0x${string}`) {
  const ledger = getLedgerContract();
  return ledger.read.positionsOf([participant]);
}
