// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Script } from "forge-std/Script.sol";
import { EntitlementLedger } from "../src/EntitlementLedger.sol";

contract Deploy is Script {
    function run() external returns (EntitlementLedger ledger) {
        address operatorAlpha = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        address operatorBeta = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        address deskNorth = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        address deskSouth = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
        address deskEast = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
        address deskWest = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc;
        address deskCentral = 0x976EA74026E726554dB657fA54763abd0C3a0aa9;

        address[] memory operators = new address[](2);
        operators[0] = operatorAlpha;
        operators[1] = operatorBeta;

        address[] memory participants = new address[](5);
        participants[0] = deskNorth;
        participants[1] = deskSouth;
        participants[2] = deskEast;
        participants[3] = deskWest;
        participants[4] = deskCentral;

        uint256[] memory positions = new uint256[](5);
        positions[0] = 1_000_000 ether;
        positions[1] = 750_000 ether;
        positions[2] = 500_000 ether;
        positions[3] = 400_000 ether;
        positions[4] = 350_000 ether;

        vm.startBroadcast();
        ledger = new EntitlementLedger(operators, participants, positions);
        vm.stopBroadcast();

        string memory json = string.concat(
            '{\n  "ledger": "',
            vm.toString(address(ledger)),
            '",\n  "operatorAlpha": "',
            vm.toString(operatorAlpha),
            '",\n  "operatorBeta": "',
            vm.toString(operatorBeta),
            '",\n  "deskNorth": "',
            vm.toString(deskNorth),
            '",\n  "deskSouth": "',
            vm.toString(deskSouth),
            '",\n  "deskEast": "',
            vm.toString(deskEast),
            '",\n  "deskWest": "',
            vm.toString(deskWest),
            '",\n  "deskCentral": "',
            vm.toString(deskCentral),
            '"\n}\n'
        );
        vm.writeFile("../nextjs/app/lib/deployment.json", json);
    }
}
