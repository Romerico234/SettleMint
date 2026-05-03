// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract SettlementProof {
    address public immutable paymentToken;

    event SettlementRecorded(
        bytes32 indexed cycleId,
        bytes32 indexed obligationId,
        address indexed payer,
        address payee,
        uint256 amount
    );

    constructor(address paymentToken_) {
        paymentToken = paymentToken_;
    }

    function recordSettlementPayment(
        bytes32 cycleId,
        bytes32 obligationId,
        address payable payee,
        uint256 amount
    ) external payable {
        require(payee != address(0), "payee required");
        require(amount > 0, "payment required");

        if (paymentToken == address(0)) {
            require(msg.value == amount, "native amount mismatch");

            (bool sent, ) = payee.call{value: amount}("");
            require(sent, "payee transfer failed");
        } else {
            require(msg.value == 0, "native value not accepted");
            require(IERC20(paymentToken).transferFrom(msg.sender, payee, amount), "token transfer failed");
        }

        emit SettlementRecorded(cycleId, obligationId, msg.sender, payee, amount);
    }
}
