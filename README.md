# supply-info-api

An API for basic info about the Juno token supply.

The base route `/` returns all info in JSON:

```json
{
  "circulatingSupply": "31511686.018182",
  "communityPool": "20008679.404121",
  "denom": "JUNO",
  "totalSupply": "65336746.085331"
}
```

## Other routes

- `/circulating-supply`: returns circulating supply in plain text
- `/total-supply`: returns total supply in plain text
- `/community-pool`: returns community pool size in plain text
- `/denom`: returns denom in plain text

### How circulating supply is calculated

1. Get total supply.
2. Get community pool.
3. Subtract community pool from total supply.
4. Iterate through list of vesting amounts for large accounts (like the Dev Fund), and subtract the vesting ammount from total supply.

This yields the circulating supply.

Vesting accounts are provided by an environment variable. See `.env.example` for an example.
