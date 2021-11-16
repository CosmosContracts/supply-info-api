const axios = require("axios");
const express = require("express");
const { Decimal } = require("@cosmjs/math");
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

// Declare variables
let totalSupply, communityPool, circulatingSupply;

// Gets supply info from chain
async function updateData() {
    console.log("Updating supply info", new Date());

  // Get total supply
  totalSupply = await axios({
    method: "get",
    url: `${process.env.REST_API_ENDPOINT}/cosmos/bank/v1beta1/supply/ujuno`,
  });
  console.log("Total supply: ", totalSupply.data.amount.amount);

  // Get community pool
  communityPool = await axios({
    method: "get",
    url: `${process.env.REST_API_ENDPOINT}/cosmos/distribution/v1beta1/community_pool`,
  });
  console.log("Community pool: ", communityPool.data.pool[0].amount);

  // Subtract community pool from total supply
  circulatingSupply =
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
}

// Get initial data
updateData();

// Update data on an interval (2 hours)
setInterval(updateData, 7200000);

app.get("/", async (req, res) => {
  res.json({
    circulatingSupply: Decimal.fromAtomics(circulatingSupply, 6).toString(),
    communityPool: Decimal.fromAtomics(
      communityPool.data.pool[0].amount.split(".")[0],
      6
    ).toString(),
    denom: "JUNO",
    totalSupply: Decimal.fromAtomics(
      totalSupply.data.amount.amount,
      6
    ).toString(),
  });
});

app.get("/circulating-supply", async (req, res) => {
  res.send(Decimal.fromAtomics(circulatingSupply, 6).toString())
});

app.get("/total-supply", async (req, res) => {
  res.send(Decimal.fromAtomics(
      totalSupply.data.amount.amount,
      6
  ).toString())
});

app.get("/community-pool", async (req, res) => {
  res.send(Decimal.fromAtomics(
      communityPool.data.pool[0].amount.split(".")[0],
      6
    ).toString())
});

app.get("/denom", async (req, res) => {
  res.send("JUNO")
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
