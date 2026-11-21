/*
  =====================================================================
   PROJECT CONFIG  -  edit this file after you deploy in Remix
  =====================================================================
   1. Paste your 4 contract addresses below.
   2. Paste your Pinata CIDs (metadata JSON CID or image CID) below.
   You can also paste them from the website itself: click "Settings"
   (gear icon). Values saved there are kept in your browser and
   override this file.
*/

window.APP_CONFIG = {
  // Sepolia test network. Change to 1337 / 5777 if you use Ganache.
  network: {
    chainId: 11155111,
    name: "Sepolia",
    explorer: "https://sepolia.etherscan.io"
  },

  // Pinata public gateway (or your own dedicated gateway)
  ipfsGateway: "https://gateway.pinata.cloud/ipfs/",

  // ---------------------------------------------------------------
  //  GLOWRIST  (florist)
  // ---------------------------------------------------------------
  glowrist: {
    gloomEuro: "0x5662C07fA46D12773cf8622D4d5f089D9034507C",          // GloomEuro.sol (ERC-20) address
    preorder: "0xaBd9623aF97517eF5C3648fD0A8bB9f269A5677C",           // GlowristPreorder.sol (ERC-721) address

    // Flower artwork on Pinata. Pick these when you create a batch.
    // "reservation" = picture on the pre-order NFT
    // "keepsake"    = picture the customer gets after collecting
    flowerCIDs: [
      { label: "Red Rose - reservation",   cid: "" },
      { label: "Red Rose - keepsake",      cid: "" },
      { label: "Peony - reservation",      cid: "" },
      { label: "Peony - keepsake",         cid: "" },
      { label: "Tulip - reservation",      cid: "" },
      { label: "Tulip - keepsake",         cid: "" }
    ]
  },

  // ---------------------------------------------------------------
  //  SOCIETY CREDIT UNION  -  TRANCHORYX
  // ---------------------------------------------------------------
  society: {
    security: "0x437Ca587a1DBc2a929a7BB68fa002Ce311283Fcd",           // TranchoryxSecurity.sol (ERC-721) address
    interest: "0x852A192E8222e7dD49E7BA8f2C969Bad82d009F8",           // TranchoryxInterest.sol (ERC-20) address

    // Your 5 certificates on Pinata. Put the CID of each certificate
    // (metadata JSON CID is best, image CID also works).
    // The details below fill the issue form automatically - change them
    // so they match the text printed on each certificate.
    certificates: [
      { label: "TRX-MBS-001 - Series A", cid: "", securityId: "TRX-MBS-001", series: "SERIES-A", faceValue: 100000, couponPercent: 6.00, paymentsPerYear: 1,  issueDate: "2025-11-20", maturityDate: "2028-11-20" },
      { label: "TRX-MBS-002 - Series A", cid: "", securityId: "TRX-MBS-002", series: "SERIES-A", faceValue: 250000, couponPercent: 5.75, paymentsPerYear: 2,  issueDate: "2025-11-20", maturityDate: "2030-11-20" },
      { label: "TRX-MBS-003 - Series B", cid: "", securityId: "TRX-MBS-003", series: "SERIES-B", faceValue: 50000,  couponPercent: 5.50, paymentsPerYear: 4,  issueDate: "2026-01-15", maturityDate: "2029-01-15" },
      { label: "TRX-MBS-004 - Series B", cid: "", securityId: "TRX-MBS-004", series: "SERIES-B", faceValue: 150000, couponPercent: 6.25, paymentsPerYear: 2,  issueDate: "2026-01-15", maturityDate: "2031-01-15" },
      { label: "TRX-MBS-005 - Series C", cid: "", securityId: "TRX-MBS-005", series: "SERIES-C", faceValue: 75000,  couponPercent: 5.25, paymentsPerYear: 12, issueDate: "2026-03-01", maturityDate: "2029-03-01" }
    ]
  }
};
