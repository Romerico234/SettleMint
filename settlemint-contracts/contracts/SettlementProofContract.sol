// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract SettlementProof {
    event SettlementRecorded(
        bytes32 indexed cycleId,
        bytes32 indexed obligationId,
        address indexed payer,
        address payee,
        uint256 amount
    );

    function recordSettlementPayment(
        bytes32 cycleId,
        bytes32 obligationId,
        address payable payee
    ) external payable {
        require(payee != address(0), "payee required");
        require(msg.value > 0, "payment required");

        (bool sent, ) = payee.call{value: msg.value}("");
        require(sent, "payee transfer failed");

        emit SettlementRecorded(cycleId, obligationId, msg.sender, payee, msg.value);
    }
}
