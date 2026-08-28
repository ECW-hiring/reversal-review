export const entitlementLedgerAbi = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "transferId", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "reverseTransfer",
    inputs: [
      { name: "transferId", type: "bytes32" },
      { name: "holderAttestation", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "batchReverse",
    inputs: [{ name: "ids", type: "bytes32[]" }],
    outputs: [{ name: "successCount", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "positionOf",
    inputs: [{ name: "participant", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "positionsOf",
    inputs: [{ name: "participant", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalReversed",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "TransferExecuted",
    inputs: [
      { name: "transferId", type: "bytes32", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fromBalance", type: "uint256", indexed: false },
      { name: "toBalance", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TransferReversed",
    inputs: [
      { name: "transferId", type: "bytes32", indexed: true },
      { name: "operator", type: "address", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "fromBalance", type: "uint256", indexed: false },
      { name: "toBalance", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BatchReverseCompleted",
    inputs: [
      { name: "operator", type: "address", indexed: true },
      { name: "totalReversed", type: "uint256", indexed: false },
      { name: "successCount", type: "uint256", indexed: false },
    ],
  },
] as const;

export type DeploymentConfig = {
  ledger: `0x${string}`;
  operatorAlpha: `0x${string}`;
  operatorBeta: `0x${string}`;
  deskNorth: `0x${string}`;
  deskSouth: `0x${string}`;
  deskEast: `0x${string}`;
  deskWest: `0x${string}`;
  deskCentral: `0x${string}`;
};

export const PARTICIPANTS = ["deskNorth", "deskSouth", "deskEast"] as const;
