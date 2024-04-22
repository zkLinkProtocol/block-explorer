export const addTokenToWeb3Wallet = async ({
  address,
  symbol,
  decimals,
  image,
}: {
  address: string;
  symbol: string;
  decimals: number;
  image: string;
}) => {
  const wasAdded = await window.ethereum.request({
    method: "wallet_watchAsset",
    params: {
      type: "ERC20",
      options: {
        address,
        symbol,
        decimals,
        image,
      },
    },
  });

  if (wasAdded) {
    console.log("Thanks for your interest!");
  } else {
    console.log("Your loss!");
  }
};
