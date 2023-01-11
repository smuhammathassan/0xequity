import hre, { ethers } from "hardhat";

const fetchOffers = async (LegalToken: any, MarketplaceInstance: any) => {
  const WLegalTokenAddess = await MarketplaceInstance.LegalToWLegal(
    LegalToken.address
  );
  let sellerAddresses = [];
  let offers = [];

  [sellerAddresses, offers] = await MarketplaceInstance.viewSellOffers(
    WLegalTokenAddess
  );

  for (let i = 0; i < sellerAddresses.length; i++) {
    console.log(
      sellerAddresses[i],
      "=> ",
      offers[i][0] / 1e18,
      " ",
      offers[i][1] / 1e18
    );
  }

  return { sellerAddresses, offers };
};

export default fetchOffers;
