/*
  Contract ABIs (human-readable format used by ethers.js v6).
  These match the 4 .sol files in /contracts. If you change a function
  in Solidity, change the matching line here.
*/

window.ABIS = {

  GloomEuro: [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function owner() view returns (address)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function issueTestFunds(address to, uint256 amount)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event TestFundsIssued(address indexed to, uint256 amount)"
  ],

  GlowristPreorder: [
    "function owner() view returns (address)",
    "function verifier() view returns (address)",
    "function gloomEuro() view returns (address)",
    "function totalBatches() view returns (uint256)",
    "function nextTokenId() view returns (uint256)",
    "function getBatch(uint256 batchId) view returns (tuple(string name, string origin, uint256 totalStems, uint256 reservedStems, uint256 pricePerStem, uint256 growerCostPerStem, uint256 deliveryDeadline, address grower, uint8 milestonesPaid, uint256 escrowBalance, uint256 growerPaid, uint8 status, string reservationCID, string keepsakeCID))",
    "function getReservation(uint256 tokenId) view returns (tuple(uint256 batchId, uint256 stems, uint256 amountPaid))",
    "function tokenKind(uint256 tokenId) view returns (uint8)",
    "function keepsakeBatch(uint256 tokenId) view returns (uint256)",
    "function tokensOf(address account) view returns (uint256[])",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function growerCommitment(uint256 batchId) view returns (uint256)",
    "function milestonePercent(uint8 milestone) pure returns (uint256)",
    "function createBatch(string name, string origin, uint256 totalStems, uint256 pricePerStem, uint256 growerCostPerStem, uint256 deliveryDeadline, address grower, string reservationCID, string keepsakeCID) returns (uint256)",
    "function reserve(uint256 batchId, uint256 stems) returns (uint256)",
    "function collectFlowers(uint256 tokenId) returns (uint256)",
    "function claimRefund(uint256 tokenId)",
    "function verifyMilestone(uint256 batchId)",
    "function cancelBatch(uint256 batchId)",
    "function topUpEscrow(uint256 batchId, uint256 amount)",
    "function withdrawShopRevenue(uint256 batchId)",
    "function setVerifier(address newVerifier)",
    "function transferFrom(address from, address to, uint256 tokenId)",
    "event Reserved(uint256 indexed tokenId, uint256 indexed batchId, address indexed customer, uint256 stems, uint256 amountPaid)",
    "event MilestoneVerified(uint256 indexed batchId, uint8 milestone, uint256 amountPaid, address indexed grower)",
    "event FlowersCollected(uint256 indexed reservationTokenId, uint256 indexed keepsakeTokenId, address indexed customer)"
  ],

  TranchoryxSecurity: [
    "function owner() view returns (address)",
    "function name() view returns (string)",
    "function approvedInvestor(address) view returns (bool)",
    "function pendingApproval(address) view returns (bool)",
    "function getApplicants() view returns (address[])",
    "function requestApproval()",
    "function approveInvestor(address investor, bool approved)",
    "function issueSecurity(address to, string securityId, string series, uint256 faceValue, uint16 couponBps, uint8 paymentsPerYear, uint64 issueDate, uint64 maturityDate, string tokenCID) returns (uint256)",
    "function redeemAtMaturity(uint256 tokenId)",
    "function getSecurity(uint256 tokenId) view returns (tuple(string securityId, string series, uint256 faceValue, uint16 couponBps, uint8 paymentsPerYear, uint64 issueDate, uint64 maturityDate, bool redeemed, address lastHolder, string tokenCID))",
    "function tokenIdOf(string securityId) view returns (uint256)",
    "function couponPerPeriod(uint256 tokenId) view returns (uint256)",
    "function totalPeriods(uint256 tokenId) view returns (uint256)",
    "function dueDate(uint256 tokenId, uint256 period) view returns (uint256)",
    "function lifecycleStatus(uint256 tokenId) view returns (uint8)",
    "function holderOf(uint256 tokenId) view returns (address)",
    "function verifyOwnership(uint256 tokenId, address wallet) view returns (bool)",
    "function totalSecurities() view returns (uint256)",
    "function securitiesOf(address account) view returns (uint256[])",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function transferFrom(address from, address to, uint256 tokenId)"
  ],

  TranchoryxInterest: [
    "function owner() view returns (address)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function totalFunded() view returns (uint256)",
    "function totalEntitled() view returns (uint256)",
    "function totalClaimed() view returns (uint256)",
    "function totalSettled() view returns (uint256)",
    "function availableFunding() view returns (uint256)",
    "function confirmFunding(uint256 amount, string bankRef)",
    "function recordEntitlement(uint256 tokenId, uint256 period)",
    "function confirmFiatSettlement(uint256 requestId, string bankRef)",
    "function rejectRedemption(uint256 requestId, string reason)",
    "function claimInterest(uint256 tokenId, uint256 period)",
    "function requestRedemption(uint256 amount) returns (uint256)",
    "function getEntitlement(uint256 tokenId, uint256 period) view returns (tuple(address holder, uint256 amount, bool recorded, bool claimed, uint64 recordedAt))",
    "function getRedemption(uint256 requestId) view returns (tuple(address investor, uint256 amount, uint8 status, string bankRef, uint64 requestedAt))",
    "function redemptionCount() view returns (uint256)",
    "function redemptionsOf(address investor) view returns (uint256[])",
    "function transfer(address to, uint256 amount) returns (bool)"
  ]
};
