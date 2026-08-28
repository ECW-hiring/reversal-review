// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IEntitlementLedger
/// @notice Transfer layer for tokenized security entitlements on a permissioned ledger.
interface IEntitlementLedger {
    struct TransferRecord {
        address from;
        address to;
        uint256 amount;
        bytes32 transferId;
        uint64 timestamp;
        bool settled;
    }

    event TransferExecuted(
        bytes32 indexed transferId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fromBalance,
        uint256 toBalance
    );

    event TransferReversed(
        bytes32 indexed transferId,
        address indexed operator,
        address indexed from,
        address to,
        uint256 amount,
        uint256 fromBalance,
        uint256 toBalance
    );

    event BatchReverseCompleted(address indexed operator, uint256 totalReversed, uint256 successCount);

    function transfer(address to, uint256 amount, bytes32 transferId) external;

    function reverseTransfer(bytes32 transferId, bytes calldata holderAttestation) external;

    function batchReverse(bytes32[] calldata ids) external returns (uint256 successCount);

    function positionOf(address participant) external view returns (uint256);

    function positionsOf(address participant) external view returns (uint256);

    function getTransfer(bytes32 transferId) external view returns (TransferRecord memory);

    function isOperator(address account) external view returns (bool);

    function totalReversed() external view returns (uint256);
}
