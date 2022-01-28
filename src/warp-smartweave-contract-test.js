import Arweave from "arweave";

// Set up Arweave client
export const arweaveTest = Arweave.init({
  host: "testnet.redstone.tools",
  port: 443,
  protocol: "https",
});
