// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Script } from "forge-std/Script.sol";
import { EntitlementLedger } from "../src/EntitlementLedger.sol";

/// @dev Seeds ordinary settlement history — no reversals. Console opens on a lived-in ledger.
contract Seed is Script {
    uint256 internal constant DESK_NORTH = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
    uint256 internal constant DESK_SOUTH = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;
    uint256 internal constant DESK_EAST = 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a;
    uint256 internal constant DESK_WEST = 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba;
    uint256 internal constant DESK_CENTRAL = 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e;

    function run() external {
        EntitlementLedger ledger = EntitlementLedger(vm.envAddress("LEDGER_ADDRESS"));

        address north = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        address south = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
        address east = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
        address west = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc;
        address central = 0x976EA74026E726554dB657fA54763abd0C3a0aa9;

        _settle(ledger, DESK_NORTH, north, south, 45_000 ether, "seed-001");
        _settle(ledger, DESK_SOUTH, south, east, 22_500 ether, "seed-002");
        vm.roll(block.number + 1);
        _settle(ledger, DESK_EAST, east, west, 18_000 ether, "seed-003");
        _settle(ledger, DESK_WEST, west, central, 12_000 ether, "seed-004");
        vm.roll(block.number + 1);
        _settle(ledger, DESK_NORTH, north, central, 30_000 ether, "seed-005");
        _settle(ledger, DESK_CENTRAL, central, south, 15_000 ether, "seed-006");
        _settle(ledger, DESK_SOUTH, south, north, 10_000 ether, "seed-007");
        vm.roll(block.number + 2);
        _settle(ledger, DESK_NORTH, north, east, 25_000 ether, "seed-008");
        _settle(ledger, DESK_EAST, east, south, 8_500 ether, "seed-009");
        _settle(ledger, DESK_SOUTH, south, west, 14_000 ether, "seed-010");
        vm.roll(block.number + 1);
        _settle(ledger, DESK_WEST, west, north, 20_000 ether, "seed-011");
        _settle(ledger, DESK_CENTRAL, central, east, 11_000 ether, "seed-012");
        vm.roll(block.number + 3);
        _settle(ledger, DESK_NORTH, north, west, 16_500 ether, "seed-013");
        _settle(ledger, DESK_EAST, east, central, 9_000 ether, "seed-014");
        _settle(ledger, DESK_SOUTH, south, central, 7_500 ether, "seed-015");
        vm.roll(block.number + 1);
        _settle(ledger, DESK_WEST, west, east, 13_250 ether, "seed-016");
        _settle(ledger, DESK_CENTRAL, central, north, 19_000 ether, "seed-017");
        vm.roll(block.number + 2);
        _settle(ledger, DESK_NORTH, north, south, 12_000 ether, "seed-018");
        _settle(ledger, DESK_EAST, east, north, 6_750 ether, "seed-019");
        _settle(ledger, DESK_SOUTH, south, east, 5_500 ether, "seed-020");
    }

    function _settle(
        EntitlementLedger ledger,
        uint256 signerKey,
        address from,
        address to,
        uint256 amount,
        string memory label
    ) internal {
        vm.startBroadcast(signerKey);
        ledger.transfer(to, amount, keccak256(bytes(label)));
        vm.stopBroadcast();
    }
}
