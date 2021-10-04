const axios = require("axios");
const express = require("express");
// const { fromUtf8 } = require("@cosmjs/encoding");
// const {
//   AuthExtension,
//   QueryClient,
//   setupAuthExtension,
//   StargateClient,
// } = require("@cosmjs/stargate");
// const { Tendermint34Client } = require("@cosmjs/tendermint-rpc");
// const textEncoding = require("text-encoding");
// var TextDecoder = textEncoding.TextDecoder;

require("dotenv").config();

const vestingAccounts = process.env.VESTING_ACCOUNTS
  ? process.env.VESTING_ACCOUNTS.split(",")
  : [];

const app = express();
const port = process.env.PORT || 3000;

// // TODO maybe we need this auth extension to query vesting info?
// async function makeClientWithAuth(rpcUrl) {
//   const tmClient = await Tendermint34Client.connect(rpcUrl);
//   return [QueryClient.withExtensions(tmClient, setupAuthExtension), tmClient];
// }

app.get("/", async (req, res) => {
  // Get total supply
  const totalSupply = await axios({
    method: "get",
    url: `${process.env.REST_API_ENDPOINT}/cosmos/bank/v1beta1/supply/ujuno`,
  });

  console.log(totalSupply.data);

  // Get community pool
  const communityPool = await axios({
    method: "get",
    url: `${process.env.REST_API_ENDPOINT}/cosmos/distribution/v1beta1/community_pool`,
  });

  console.log(communityPool.data);

  // Subtract community pool from total supply
  let circulatingSupply =
    totalSupply.data.amount.amount - communityPool.data.pool[0].amount;

  console.log(circulatingSupply);

  // // TODO query vesting account info and subtract from total
  // const client = await StargateClient.connect(process.env.RPC_ENDPOINT);
  // const [client, tmClient] = await makeClientWithAuth(process.env.RPC_ENDPOINT);
  // console.log(client);

  // vestingAccounts.forEach(async (acc) => {
  //   const account = await client.auth.account(acc);
  //   console.log(account);
  //   // const accountInfo = new TextDecoder().decode(account.value);
  //   // console.log(accountInfo);
  //   // let accountInfo = await client.getAccount(account);
  //   // console.log(accountInfo);
  //   // let balance = await client.getBalance(account, "ujuno");
  //   // console.log(balance);
  // });

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
