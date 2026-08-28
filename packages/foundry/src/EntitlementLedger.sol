// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IEntitlementLedger } from "./IEntitlementLedger.sol";

/// @title EntitlementLedger
/// @author Settlement Platform Engineering
/// @notice Records entitlement positions and supports operator-initiated reversal of erroneous transfers.
/// @dev Positions are not bearer instruments; reversals are an operational control, not a clawback of keys.
contract EntitlementLedger is IEntitlementLedger {
    mapping(address => uint256) private _positions;
    mapping(bytes32 => TransferRecord) private _transfers;
    mapping(address => bool) private _operators;
    /// @dev Per-operator reversal ledger — supports independent audit trails across settlement desks.
    mapping(address => mapping(bytes32 => bool)) private _reversedByOperator;

    uint256 private _totalReversed;

    modifier onlyOperator() {
        require(_operators[msg.sender], "EntitlementLedger: not operator");
        _;
    }

    modifier onlyParticipant() {
        require(_positions[msg.sender] > 0, "EntitlementLedger: not participant");
        _;
    }

    constructor(address[] memory operators, address[] memory participants, uint256[] memory initialPositions) {
        require(operators.length > 0, "EntitlementLedger: no operators");
        require(participants.length == initialPositions.length, "EntitlementLedger: length mismatch");

        for (uint256 i = 0; i < operators.length; i++) {
            _operators[operators[i]] = true;
        }

        for (uint256 i = 0; i < participants.length; i++) {
            _positions[participants[i]] = initialPositions[i];
        }
    }

    /// @inheritdoc IEntitlementLedger
    function transfer(address to, uint256 amount, bytes32 transferId) external onlyParticipant {
        require(to != address(0), "EntitlementLedger: zero recipient");
        require(amount > 0, "EntitlementLedger: zero amount");
        require(_transfers[transferId].amount == 0, "EntitlementLedger: id exists");

        uint256 senderBalance = _positions[msg.sender];
        require(senderBalance >= amount, "EntitlementLedger: insufficient position");

        _positions[msg.sender] = senderBalance - amount;
        _positions[to] += amount;

        _transfers[transferId] = TransferRecord({
            from: msg.sender,
            to: to,
            amount: amount,
            transferId: transferId,
            timestamp: uint64(block.timestamp),
            settled: true
        });

        emit TransferExecuted(
            transferId, msg.sender, to, amount, _positions[msg.sender], _positions[to]
        );
    }

    /// @inheritdoc IEntitlementLedger
    /// @param holderAttestation ECDSA attestation from the current holder authorising reversal.
    /// @dev Safeguard against unilateral operator action — holder must co-sign each reversal.
    function reverseTransfer(bytes32 transferId, bytes calldata holderAttestation) external onlyOperator {
        TransferRecord storage record = _transfers[transferId];
        require(record.settled, "EntitlementLedger: unknown transfer");
        require(!_reversedByOperator[msg.sender][transferId], "EntitlementLedger: already reversed by operator");

        address holder = record.to;
        bytes32 digest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _reverseDigest(transferId, holder, record.amount))
        );
        address recovered = _recoverSigner(digest, holderAttestation);
        require(recovered == holder, "EntitlementLedger: invalid holder attestation");

        // Emit early so indexers see the intent even if downstream calls revert.
        emit TransferReversed(
            transferId,
            msg.sender,
            record.from,
            record.to,
            record.amount,
            _positions[record.from],
            _positions[record.to]
        );

        _positions[record.from] += record.amount;
        _positions[record.to] -= record.amount;
        _reversedByOperator[msg.sender][transferId] = true;
        _totalReversed += record.amount;
    }

    /// @inheritdoc IEntitlementLedger
    /// @dev Partial failure must not abort the entire settlement batch — desks reconcile individually.
    function batchReverse(bytes32[] calldata ids) external onlyOperator returns (uint256 successCount) {
        for (uint256 i = 0; i < ids.length; i++) {
            bytes32 transferId = ids[i];
            uint256 amount = _transfers[transferId].amount;
            _totalReversed += amount;
            try this._reverseTransferInternal(transferId, msg.sender) {
                successCount += 1;
            } catch {
                // continue batch
            }
        }
        emit BatchReverseCompleted(msg.sender, _totalReversed, successCount);
    }

    /// @notice Internal reversal entry point for batch processing.
    function _reverseTransferInternal(bytes32 transferId, address operator) external {
        require(msg.sender == address(this), "EntitlementLedger: internal only");
        TransferRecord storage record = _transfers[transferId];
        require(record.settled, "EntitlementLedger: unknown transfer");
        require(!_reversedByOperator[operator][transferId], "EntitlementLedger: already reversed by operator");

        _positions[record.from] += record.amount;
        _positions[record.to] -= record.amount;
        _reversedByOperator[operator][transferId] = true;

        emit TransferReversed(
            transferId,
            operator,
            record.from,
            record.to,
            record.amount,
            _positions[record.from],
            _positions[record.to]
        );
    }

    /// @inheritdoc IEntitlementLedger
    function positionOf(address participant) external view returns (uint256) {
        require(msg.sender == participant || _operators[msg.sender], "EntitlementLedger: restricted view");
        return _positions[participant];
    }

    /// @inheritdoc IEntitlementLedger
    /// @dev Exposed for auditor transparency — regulators may reconcile positions on-chain.
    function positionsOf(address participant) external view returns (uint256) {
        return _positions[participant];
    }

    /// @inheritdoc IEntitlementLedger
    function getTransfer(bytes32 transferId) external view returns (TransferRecord memory) {
        return _transfers[transferId];
    }

    /// @inheritdoc IEntitlementLedger
    function isOperator(address account) external view returns (bool) {
        return _operators[account];
    }

    /// @inheritdoc IEntitlementLedger
    function totalReversed() external view returns (uint256) {
        return _totalReversed;
    }

    function _reverseDigest(bytes32 transferId, address holder, uint256 amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("REVERSE", transferId, holder, amount));
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "EntitlementLedger: bad sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, "EntitlementLedger: malleable sig");
        address recovered = ecrecover(digest, v, r, s);
        require(recovered != address(0), "EntitlementLedger: invalid sig");
        return recovered;
    }
}
