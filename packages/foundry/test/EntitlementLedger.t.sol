// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Test } from "forge-std/Test.sol";
import { EntitlementLedger } from "../src/EntitlementLedger.sol";

contract EntitlementLedgerTest is Test {
    EntitlementLedger internal ledger;

    address internal operatorAlpha = address(0xA11CE);
    address internal operatorBeta = address(0xBEEF);

    uint256 internal deskNorthKey = 0x10001;
    uint256 internal deskSouthKey = 0x10002;
    uint256 internal deskEastKey = 0x10003;

    address internal deskNorth;
    address internal deskSouth;
    address internal deskEast;

    function setUp() public {
        deskNorth = vm.addr(deskNorthKey);
        deskSouth = vm.addr(deskSouthKey);
        deskEast = vm.addr(deskEastKey);
        address[] memory operators = new address[](2);
        operators[0] = operatorAlpha;
        operators[1] = operatorBeta;

        address[] memory participants = new address[](3);
        participants[0] = deskNorth;
        participants[1] = deskSouth;
        participants[2] = deskEast;

        uint256[] memory positions = new uint256[](3);
        positions[0] = 1_000_000e18;
        positions[1] = 750_000e18;
        positions[2] = 500_000e18;

        ledger = new EntitlementLedger(operators, participants, positions);
    }

    function _positionOf(address participant) internal returns (uint256) {
        vm.prank(operatorAlpha);
        return ledger.positionOf(participant);
    }

    function testInitialPositions() public {
        assertEq(_positionOf(deskNorth), 1_000_000e18);
        assertEq(_positionOf(deskSouth), 750_000e18);
        assertEq(_positionOf(deskEast), 500_000e18);
    }

    function testTransferBetweenDesks() public {
        bytes32 transferId = keccak256("transfer-001");

        vm.prank(deskNorth);
        ledger.transfer(deskSouth, 100_000e18, transferId);

        assertEq(_positionOf(deskNorth), 900_000e18);
        assertEq(_positionOf(deskSouth), 850_000e18);

        EntitlementLedger.TransferRecord memory record = ledger.getTransfer(transferId);
        assertTrue(record.settled);
        assertEq(record.amount, 100_000e18);
    }

    function testReverseTransferWithHolderAttestation() public {
        bytes32 transferId = keccak256("transfer-reverse-001");

        vm.prank(deskNorth);
        ledger.transfer(deskSouth, 50_000e18, transferId);

        bytes memory attestation = _signReverse(deskSouthKey, transferId, deskSouth, 50_000e18);

        vm.prank(operatorAlpha);
        ledger.reverseTransfer(transferId, attestation);

        assertEq(_positionOf(deskNorth), 1_000_000e18);
        assertEq(_positionOf(deskSouth), 750_000e18);
    }

    function testBatchReverseAllSuccessful() public {
        bytes32 id1 = keccak256("batch-1");
        bytes32 id2 = keccak256("batch-2");

        vm.startPrank(deskNorth);
        ledger.transfer(deskSouth, 10_000e18, id1);
        ledger.transfer(deskEast, 5_000e18, id2);
        vm.stopPrank();

        bytes32[] memory ids = new bytes32[](2);
        ids[0] = id1;
        ids[1] = id2;

        vm.prank(operatorAlpha);
        uint256 count = ledger.batchReverse(ids);

        assertEq(count, 2);
        assertEq(_positionOf(deskNorth), 1_000_000e18);
        assertEq(_positionOf(deskSouth), 750_000e18);
        assertEq(_positionOf(deskEast), 500_000e18);
    }

    function testOperatorGate() public {
        vm.prank(deskNorth);
        vm.expectRevert("EntitlementLedger: not operator");
        ledger.batchReverse(new bytes32[](0));
    }

    function testPositionsOfMatchesPositionOf() public {
        assertEq(ledger.positionsOf(deskNorth), _positionOf(deskNorth));
    }

    function testTransferIdUniqueness() public {
        bytes32 transferId = keccak256("dup");
        vm.startPrank(deskNorth);
        ledger.transfer(deskSouth, 1e18, transferId);
        vm.expectRevert("EntitlementLedger: id exists");
        ledger.transfer(deskEast, 1e18, transferId);
        vm.stopPrank();
    }

    function testInsufficientPositionReverts() public {
        vm.prank(deskEast);
        vm.expectRevert("EntitlementLedger: insufficient position");
        ledger.transfer(deskNorth, 1_000_000e18, keccak256("too-much"));
    }

    function testIsOperatorFlags() public view {
        assertTrue(ledger.isOperator(operatorAlpha));
        assertTrue(ledger.isOperator(operatorBeta));
        assertFalse(ledger.isOperator(deskNorth));
    }

    function testMultipleTransfersPreserveConservation() public {
        vm.startPrank(deskNorth);
        ledger.transfer(deskSouth, 25_000e18, keccak256("m1"));
        ledger.transfer(deskEast, 25_000e18, keccak256("m2"));
        vm.stopPrank();

        uint256 total = _positionOf(deskNorth) + _positionOf(deskSouth) + _positionOf(deskEast);
        assertEq(total, 2_250_000e18);
    }

    function _signReverse(uint256 privateKey, bytes32 transferId, address holder, uint256 amount)
        internal
        pure
        returns (bytes memory)
    {
        bytes32 inner = keccak256(abi.encodePacked("REVERSE", transferId, holder, amount));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
