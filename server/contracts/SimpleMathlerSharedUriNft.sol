// contracts/SimpleMathlerSharedUriNft.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleMathlerSharedUriNft is ERC721, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURIString;

    mapping(address => bool) private _hasReceivedAchievement;
    event AchievementNftMinted(address indexed recipient, uint256 indexed tokenId);

    constructor(
        address initialOwner,
        string memory baseURI
    ) ERC721("Mathler Achievement", "MTHA") Ownable(initialOwner) {
        _baseTokenURIString = baseURI;
        _nextTokenId = 1;
    }

    // Override to return the shared URI for all tokens.
    // To ensure it reverts for non-existent tokens as per ERC721 standard,
    // we first call ownerOf(tokenId), which itself will revert if the token doesn't exist.
    // If it doesn't revert, the token exists, and we can proceed to return the URI.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // Calling ownerOf(tokenId) will cause a revert if the token does not exist,
        // which fulfills the ERC721 requirement for tokenURI.
        // We don't need to use the 'tokenOwner' variable for anything else here.
        address tokenOwner = ownerOf(tokenId); 
        // Add an explicit require for safety, though ownerOf should have already reverted.
        // This also handles the edge case where a token might somehow exist with owner address(0) (not typical).
        require(tokenOwner != address(0), "ERC721: URI query for nonexistent token or token with no owner");

        return _baseTokenURIString;
    }
    
    function setBaseTokenURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURIString = newBaseURI;
    }

    function mintAchievement(address recipient) public onlyOwner returns (uint256) {
        require(!_hasReceivedAchievement[recipient], "MTHA: Achievement already awarded.");
        
        uint256 currentTokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(recipient, currentTokenId);
        
        _hasReceivedAchievement[recipient] = true;
        emit AchievementNftMinted(recipient, currentTokenId);
        return currentTokenId;
    }
    
    function getNextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}