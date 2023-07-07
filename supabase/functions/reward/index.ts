import { Application, Router } from "oak";
import { getEnvKeypair } from "../utils/keypair.ts";
import { getCollectiblesByWallet } from "../utils/collectibles.ts";
import * as postgres from "postgres";
import {
  deleteSweepstakes,
  insertSweepstakes,
  lookupSweepstakes,
} from "./database.ts";
import { SweepstakesObj } from "./types.ts";

import { Metaplex, PublicKey, keypairIdentity } from "@metaplex-foundation/js";
import { Connection } from "https://esm.sh/@solana/web3.js@1.48.0";

const keypair = getEnvKeypair();
const connection = new Connection(
  "https://api.mainnet-beta.solana.com",
  // "https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ",
  { commitment: "processed" }
);
const metaplex = new Metaplex(connection).use(keypairIdentity(keypair));

const COLLECTION_ID = "BSSKxxsMXEFozV4kQoqNqhfvjpQxJBCf2jB7mR2Bqx4p";

// Database pool
const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
const pool = new postgres.Pool(databaseUrl, 3, true);

const router = new Router();
router.get("/reward", async (context) => {
  const keypair = getEnvKeypair();
  const pubkey = context.request.url.searchParams.get("pubkey");

  // Validate fields
  if (!pubkey) {
    context.response.status = 400;
    context.response.body = { error: "Missing pubkey" };
    return;
  }

  // Lookup user in database for sweepstakes
  const databaseSweepstakes = await lookupSweepstakes(pool, pubkey);

  // Shortcut if user already has a sweepstakes entry
  // if (databaseSweepstakes.length > 0) {
  //   const parsedSweeptakes = JSON.parse(databaseSweepstakes[0].sweepstakes);
  //   // Check the expiration date
  //   const currentDate = new Date();
  //   const expiration = new Date(parsedSweeptakes.expiration);
  //   if (currentDate < expiration) {
  //     context.response.body = {
  //       ...parsedSweeptakes,
  //       freshSweepstake: false,
  //     };
  //     return;
  //   } else {
  //     await deleteSweepstakes(pool, pubkey);
  //   }
  // }

  // Fetch all collectibles
  const collectibles = await getCollectiblesByWallet(keypair.publicKey);
  const filteredCollectibles = collectibles.filter(
    (c: any) => c?.collection?.id === COLLECTION_ID
  );

  // Pick a random collectible
  const sweepstakes =
    filteredCollectibles[
      Math.floor(Math.random() * filteredCollectibles.length)
    ];

  // Find expiration date
  const currentDate = new Date();
  const expiration = new Date(
    currentDate.getTime() + 20 * 60000
  ).toLocaleString();

  const sweepstakesObj: SweepstakesObj = {
    id: sweepstakes.id,
    name: sweepstakes.name,
    image: sweepstakes.media.image.url,
    expiration,
    numLeftInCollection: filteredCollectibles.length,
  };

  const transferHash = await metaplex.nfts().transfer({
    nftOrSft: {
      address: new PublicKey(sweepstakes.chainData.mint),
      tokenStandard: 3,
    },
    toOwner: new PublicKey(pubkey),
  });

  // Insert into database
  await insertSweepstakes(pool, pubkey, sweepstakesObj);
  context.response.body = {
    ...sweepstakesObj,
    freshSweepstakes: true,
    mint: sweepstakes.chainData.mint,
    transferHash,
  };
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });
