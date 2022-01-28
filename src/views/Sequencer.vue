<template>
  <div class="sequencer">
    <div>
      <h1 class="text-center">
        Contract
      </h1>
      <div class="text-center mb-4">
        <a
          target="_blank"
          :href="`https://scanner.redstone.tools/#/app/contract/${contractId}`"
          >{{ contractId }}</a
        >
      </div>
      <div class="d-flex justify-content-center col-12 mb-3">
        <div class="align-self-center">
          Your address: <span class="font-weight-bold">{{ userAddress }}</span>
        </div>
        <b-button class="ml-3" variant="outline-primary" @click="mint"
          >Mint</b-button
        >
      </div>
      <b-tabs content-class="mt-3" class="contract-tabs" :lazy="true">
        <b-tab title="Transfer" active>
          <ul>
            <div class="d-flex">
              <div class="p-2 col-6 font-weight-bold bluetext">Address</div>
              <div class="p-2 col-2 font-weight-bold bluetext">Balance</div>
            </div>
            <li
              v-for="(balance, index) in balances"
              :key="balance.address"
              class="d-flex p-2"
              v-bind:class="{ owner: balance.active }"
            >
              <div class="col-6 align-self-center">
                {{ balance.address }}
              </div>
              <div class="p-2 col-2 font-weight-bold d-flex align-self-center">
                <div>
                  {{ balance.balance }}
                </div>
                <div
                  v-show="balance.text"
                  class="ml-2 align-self-center greentext"
                >
                  {{ balance.text }}
                </div>
                <div
                  v-show="balance.error"
                  class="ml-2 align-self-center redtext"
                >
                  {{ balance.error }}
                </div>
              </div>
              <div class="col-4 align-self-center">
                <b-input-group>
                  <b-form-input v-model="balance.value"></b-form-input>
                  <b-input-group-append>
                    <b-button
                      class="ml-2 blue"
                      @click="transfer(balance.address, balance.value, index)"
                      >Transfer</b-button
                    >
                  </b-input-group-append>
                </b-input-group>
              </div>
            </li>
          </ul>
        </b-tab>
        <b-tab title="State">
          <div class="row d-flex justify-content-center">
            <json-viewer
              class="col-8"
              :value="state"
              :expand-depth="4"
              sort
            ></json-viewer></div
        ></b-tab>
      </b-tabs>
    </div>
  </div>
</template>

<script>
import Arweave from "arweave";
import {
  SmartWeaveWebFactory,
  RedstoneGatewayInteractionsLoader,
  RedstoneGatewayContractDefinitionLoader,
  MemCache,
} from "redstone-smartweave";

import JsonViewer from "vue-json-viewer";
import deployedContracts from "../deployed-contracts.json";
import Vue from "vue";

export default {
  data() {
    return {
      arweave: null,
      contract: null,
      balances: [],
      state: null,
      contractId: deployedContracts.warp,
      userAddress: null,
    };
  },
  components: { JsonViewer },
  async mounted() {
    this.arweave = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
    });
    const smartweave = SmartWeaveWebFactory.memCachedBased(this.arweave)
      .setInteractionsLoader(
        new RedstoneGatewayInteractionsLoader(
          "https://gateway.redstone.finance"
        )
      )
      .setDefinitionLoader(
        new RedstoneGatewayContractDefinitionLoader(
          "https://gateway.redstone.finance",
          this.arweave,
          new MemCache()
        )
      )
      .build();

    this.contract = smartweave
      .contract(deployedContracts.warp)
      .connect("use_wallet");

    await this.loadBalances();
  },
  methods: {
    async transfer(address, qty, idx) {
      this.$toasted.show("Processing...");
      let oldBalance = this.balances[idx].balance;

      let userIdx = this.balances.findIndex(
        (b) => b.address == this.userAddress
      );
      console.log(this.userAddress);
      console.log("userIdx", userIdx);
      let oldBalanceUser = this.balances[userIdx].balance;

      const bundled = await this.contract.bundleInteraction({
        function: "transfer",
        target: address,
        qty: parseInt(qty),
      });
      let newResult = await this.contract.readState();

      if (newResult) {
        this.$toasted.clear();
        this.$toasted.global.success("Processed!");

        this.$toasted.global.close(`Interaction id: ${bundled.originalTxId}`);
      }
      Vue.set(this.balances, idx, {
        address: address,
        balance: newResult.state.balances[address],
        blue: true,
      });
      Vue.set(this.balances, userIdx, {
        address: this.userAddress,
        balance: newResult.state.balances[this.userAddress],
        blue: true,
        active: true,
      });
      this.balances[userIdx].error = `-${oldBalanceUser -
        this.balances[userIdx].balance}`;
      setTimeout(() => (this.balances[userIdx].error = null), 2000);
      this.balances[idx].text = `+${this.balances[idx].balance - oldBalance}`;
      setTimeout(() => (this.balances[idx].text = null), 2000);
    },
    async loadBalances() {
      this.state = await this.contract.readState();
      const userAddress = await this.arweave.wallets.jwkToAddress("use_wallet");
      this.userAddress = userAddress;

      for (const [key, value] of Object.entries(this.state.state.balances)) {
        this.balances.push({
          address: key,
          balance: value,
          blue: false,
          active: key == this.userAddress,
          error: false,
          text: false,
        });
      }
    },
    async mint() {
      await this.contract.bundleInteraction({
        function: "mint",
      });

      const newResult = await this.contract.readState();
      for (const [index, [key, value]] of Object.entries(
        Object.entries(newResult.state.balances.reverse())
      )) {
        Vue.set(this.balances, index, {
          address: key,
          balance: value,
          blue: false,
          active: key == this.userAddress,
          error: false,
          text: false,
        });
      }
    },
  },
};
</script>

<style lang="scss">
.blue {
  background-color: #5982f1 !important;
}

.bluetext {
  color: #5982f1 !important;
}
.contract-tabs > .tabs > div:first-of-type {
  height: 44px;
}
.contract-tabs {
  .tab-pane:nth-of-type(2) {
    padding-left: 0;
    padding-right: 0;

    @media (min-width: breakpoint-min(md)) {
      padding-left: 2rem;
      padding-right: 2rem;
    }
  }

  &.nav-tabs > .nav-item {
    flex: 0 0 124px !important;
  }
}
.sequencer {
  padding: 10px;
  margin: 0 auto;
  max-width: 70%;
}

.nav-tabs {
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow-y: clip;
  overflow-x: scroll;
  background-color: transparent;
}

.nav-item {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.nav-tabs > .nav-item {
  margin-bottom: 0px;
  flex: 1;
}

.nav-tabs > .nav-item .nav-link.active,
.nav-tabs > .nav-item .nav-link.active:hover,
.nav-tabs > .nav-item .nav-link.active:focus {
  background-color: #fcfcfc;
  color: #233562;
}
p {
  width: 500px;
  max-width: 90vw;
  margin: auto;
  margin-top: 30px;
  text-align: left;
}

.nav-tabs > .nav-item > .nav-link:not(.active) {
  padding: 10px 14px;
  /* height: 36px; */
  background-color: #fafafa;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  /* position: relative; */
  -webkit-box-shadow: inset 0px -6px 2px -4px #e8e8e8, 5px -5px 6px -2px #e8e8e8;
  box-shadow: inset 0px -6px 2px -4px #e8e8e8, 5px -5px 6px -2px #e8e8e8;
  &:after {
    content: " ";
    height: 23px;
    border-right: 1px solid #d9d9d9;
    border-top-width: 0;
    position: absolute;
    left: -1px;
    bottom: 7px;
  }
}

.showArrows .nav-tabs {
  margin-left: 30px;
  max-width: calc(100% - 58px);
}

.tabs:not(.showArrows) {
  li:first-of-type > .nav-link {
    border-top-left-radius: 5px;
  }

  li:last-of-type > .nav-link {
    border-top-right-radius: 5px;
  }
}
.nav-tabs {
  &.nav-item + .nav-item {
    margin-left: 0;
  }

  border-bottom: none !important;
  background-color: #f7f7f7;
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;

  > .nav-item {
    margin-bottom: -2px;

    > .nav-link {
      padding: 12px 18px;
      border: none;

      .label {
        margin-bottom: -2px;
      }

      &:hover {
        background-color: transparent;
        color: #424242;
      }
    }

    .nav-link.open {
      &,
      &:hover,
      &:focus {
        background-color: #fff;
        color: #7d7d7d;
      }
    }

    .nav-link.active {
      &,
      &:hover,
      &:focus {
        background-color: white;
        color: #7d7d7d;
        border: none;

        box-shadow: 1px 1px 2px #ccc;
      }
    }
  }
}

.hide-element {
  display: none;
}

.show-element {
  display: block;
}

.visible {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.5s linear;
  font-size: 15px;
  color: #5982f1;
  align-self: center;
}

.hidden {
  visibility: hidden;
  opacity: 0;
  transition: visibility 0s 0.5s, opacity 0.5s linear;
}

.owner {
  background-color: #e8f4f8;
}
</style>
