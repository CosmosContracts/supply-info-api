const axios = require("axios");
const express = require("express");
const { QueryClient, setupAuthExtension } = require("@cosmjs/stargate");
const { Tendermint34Client } = require("@cosmjs/tendermint-rpc");
const {
  ContinuousVestingAccount,
  DelayedVestingAccount,
  PeriodicVestingAccount,
} = require("cosmjs-types/cosmos/vesting/v1beta1/vesting");

require("dotenv").config();

const vestingAccounts = process.env.VESTING_ACCOUNTS
  ? process.env.VESTING_ACCOUNTS.split(",")
  : [];

const app = express();
const port = process.env.PORT || 3000;

async function makeClientWithAuth(rpcUrl) {
  const tmClient = await Tendermint34Client.connect(rpcUrl);
  return [QueryClient.withExtensions(tmClient, setupAuthExtension), tmClient];
}

app.get("/", async (req, res) => {
  console.log(new Date());

  // Get total supply
  const totalSupply = await axios({
    method: "get",
    url: `${process.env.REST_API_ENDPOINT}/cosmos/bank/v1beta1/supply/ujuno`,
  });
  console.log("Total supply: ", totalSupply.data.amount.amount);

  // Get community pool
  const communityPool = await axios({
    method: "get",
    url: `${process.env.REST_API_ENDPOINT}/cosmos/distribution/v1beta1/community_pool`,
  });
  console.log("Community pool: ", communityPool.data.pool[0].amount);

  // Subtract community pool from total supply
  let circulatingSupply =
    totalSupply.data.amount.amount - communityPool.data.pool[0].amount;

  // Create Tendermint RPC Client
  const [client, tmClient] = await makeClientWithAuth(process.env.RPC_ENDPOINT);

  // Iterate through vesting accounts and subtract vesting balance from total
  for (let i = 0; i < vestingAccounts.length; i++) {
    const account = await client.auth.account(vestingAccounts[i]);
    let accountInfo = PeriodicVestingAccount.decode(account.value);
    let originalVesting =
      accountInfo.baseVestingAccount.originalVesting[0].amount;
    let delegatedFree =
      accountInfo.baseVestingAccount.delegatedFree.length > 0
        ? accountInfo.baseVestingAccount.delegatedFree[0].amount
        : 0;

    circulatingSupply -= originalVesting - delegatedFree;
  }
  console.log("Circulating supply: ", circulatingSupply);

  res.json({
    circulatingSupply,
    communityPool: communityPool.data.pool[0].amount,
    decimals: 6,
    denom: "ujuno",
    totalSupply: totalSupply.data.amount.amount,
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
