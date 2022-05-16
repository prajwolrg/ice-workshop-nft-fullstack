// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./NFT.sol";

import "hardhat/console.sol";

contract MarketPlace {
    using SafeMath for uint256;

    struct Item {
        uint256 index; //Unique identifier for various NFTs on this particular MARKETPLACE
        address tokenAddress; //Contract address where the NFT exists.
        uint256 tokenID; //Identifier of NFT on that tokenAddress
        uint256 price; //Price of the NFT listed for sale
        address payable owner; //Current owner of the NFT
        string url; //Points to the additional information about NFT.

    }

    //Array of the Items listed for sale
    Item[] public items;

    //Check if the NFT is already listed
    //listedTokens[tokenAddress][tokenId]
    mapping(address => mapping(uint256 => bool)) public listedTokens;


    function listForSale(
        uint256 _tokenID,
        uint256 _price,
        address _tokenAddress,
        string memory _url
    ) public {
        uint256 index = items.length;
        NFT erc721 = NFT(_tokenAddress);

        // Check if the owner of the token is msg.sender
        require(
            msg.sender == erc721.ownerOf(_tokenID),
            "MarketPlace: Sender is not the owner of token"
        );

        //Check if the token ID is already listed
        require(
            !listedTokens[_tokenAddress][_tokenID],
            "MarketPlace: Token is already listed"
        );

        //Check if the marketplace is approved for transfer for the tokenID
        require(
            address(this) == erc721.getApproved(_tokenID) ||
                erc721.isApprovedForAll(msg.sender, address(this)),
            "MarketPlace: NFTMarketPlace is not provided approval to transfer"
        );

        items.push(
            Item(
                index,
                _tokenAddress,
                _tokenID,
                _price,
                payable(msg.sender),
                _url
            )
        );
        listedTokens[_tokenAddress][_tokenID] = true;
    }

    function buyNFT(uint256 _index) public payable {
        //Check if required price is supplied
        require(
            msg.value == items[_index].price,
            "MarketPlace: Please pay the amount equal to price"
        );

        //Transfer the NFT to the buyer
        NFT erc721 = NFT(items[_index].tokenAddress);
        erc721.safeTransferFrom(
            items[_index].owner,
            msg.sender,
            items[_index].tokenID
        );

        //Get the royalty information
        (address royaltyReceiver, uint256 royaltyAmount) = erc721.royaltyInfo(
            items[_index].tokenID,
            msg.value
        );

        //Transfer the royalty amount to the royalty reciever.
        uint256 remainingAmount = msg.value;
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            remainingAmount = msg.value - royaltyAmount;
            payable(royaltyReceiver).transfer(royaltyAmount);
        }

        //Transfer the right amount to owner 
        items[_index].owner.transfer(remainingAmount);

        //Mark particular NFT as not
        listedTokens[items[_index].tokenAddress][items[_index].tokenID] = false;

        //Remove the item from the list
        for (uint256 i = _index; i < items.length - 1; i++) {
            items[i] = items[i + 1];
            items[i].index -= 1;
        }
        items.pop();
    }

    function getItemsList() external view returns (Item[] memory) {
        return items;
    }

    function totalItems() external view returns (uint256) {
        return items.length;
    }
}
